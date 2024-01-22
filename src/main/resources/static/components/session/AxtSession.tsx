import React from "react";
import axios from "axios";
import Long from "long";
import * as chalk from 'chalk';
import ByteBuffer from "bytebuffer";
import {StatusCode} from "./StatusCode";
import * as term from "./TermCodes";
import {debounce} from "throttle-debounce"
import {Button} from "antd";
import {AxtMessage, ChannelState, decodeMessage, encodeMessage, MessageType, print} from "./AxtMessage";

interface AxtSessionProps {
}

interface AxtSessionState {
    status: Status
    instance: { instanceId: string, instanceName: string } | undefined
}

type Status = "prepare" | "opening" | "opened" | "aborted" | "closing" | "closed" | "exited"

// 云助手 SessionManager 会话连接
export default class AxtSession extends React.Component<AxtSessionProps, AxtSessionState> {
    private readonly productId: string
    private readonly regionId: string
    private readonly instanceId: string
    private container: HTMLElement | null = null
    private socketUrl: string | undefined = undefined
    private webSocket: WebSocket | undefined = undefined
    private readonly fontSize: number = 14

    private idleTimer: any              // 定时发送心跳
    private spinWait: number = 10       // 连接等待倒计时秒数
    private counting: boolean = false   // 连接等待倒计时进行中
    private lifeCycle: number = 0       // 断开重连次数
    private agentVersion: string = ""   // 实例内云助手Agent版本
    private channelId: string = ""      // 会话通道ID
    private inputSeq: number = 0;       // 消息发送计数器
    private outputSeq: number = 0;      // 消息接入计数器
    private inputQueue: AxtMessage[] = []   // 已发送、尚未被Agent确收的消息
    private lastAlive: number = Date.now()  // 上一次数据包收发时间
    private bandWidth: number = 0       // 通道的带宽限制

    private rows: number = 120            // 终端窗口宽度与高度（字符数）
    private cols: number = 80             // 终端窗口高度（字符数）

    private readonly chalk = new chalk.Chalk({level: 2})

    // import {Terminal} from "xterm";
    // <script src="/node_modules/xterm/lib/xterm.js"></script>
    // noinspection TypeScriptUnresolvedFunction
    private readonly terminal = new Terminal({
        minimumContrastRatio: 4,
        letterSpacing: 0,
        lineHeight: 1,
        fontWeight: "200",
        convertEol: false,
        cursorBlink: true
    })

    constructor(props: Readonly<AxtSessionProps> | AxtSessionProps) {
        super(props);
        const search = new URLSearchParams(window.location.search)
        this.productId = search.get("productId") ?? "ecs"
        this.regionId = search.get("regionId") ?? ""
        this.instanceId = search.get("instanceId") ?? ""
        this.state = {
            status: "prepare",
            instance: undefined
        }
    }

    // KeepAlive 心跳间隔时间：低版本为 50秒，新版本为 5 分钟；
    nextHeartbeat = (): number => {
        return this.agentVersion > "1.01" ? 300 * 1000 : 50 * 1000;
    }

    // 更新当前会话管理的连接状态
    putStatus = (status: Status, callback?: () => void): void => {
        if (this.lifeCycle <= 1) {
            switch (status) {
                case "aborted":
                    this.clearCountdown(status)
                    this.terminal.write(term.hideCursor())
                    break
                case "opened":
                    this.clearCountdown(status)
                    this.terminal.write(term.showCursor())
                    this.terminal.focus()
                    break
                default:
                    break
            }
        }

        // noinspection TypeScriptValidateTypes
        this.setState({status: status}, callback);

        switch (status) {
            case "opened":
                if (this.idleTimer) {
                    clearTimeout(this.idleTimer)
                }
                const next = this.nextHeartbeat()
                this.idleTimer = setTimeout(this.keepAlive, next)
                break
            case "closed":
                this.terminal.write(term.hideCursor())
                break;
            default:
                break
        }
    }

    // 定时发送心跳，以保持连接不断开。(若一段时间没有用户输入，Agent将会断开WebSocket连接）
    keepAlive = (): void => {
        if (this.state.status === "opened" && this.webSocket && this.webSocket.OPEN) {
            const next = this.nextHeartbeat()
            const empty = this.newMessage(MessageType.Input, ByteBuffer.allocate(0))
            this.doWrite(empty, (err?: Error | null) => {
                if (err) {
                    console.warn("%s send heartbeat %s, failed %s",
                        this.instanceId, print(empty), err.message,
                    )
                } else {
                    console.debug("%s send heartbeat %s, next %s",
                        this.instanceId, print(empty), next / 1000
                    )
                }
            })
            this.idleTimer = setTimeout(this.keepAlive.bind(this), next)
        }
    }

    // 生成一个SessionManager WebSocket上的消息
    newMessage = (type: MessageType, byteBuffer: ByteBuffer): AxtMessage => {
        const current = Long.fromNumber(Date.now())
        if (type == MessageType.Input || type == MessageType.Resize) {
            this.inputSeq++;
        }
        const message: AxtMessage = {
            msgType: type,
            version: "1.02",
            channelId: this.channelId!,
            instanceId: "", // this.instanceId,
            timestamp: current,
            inputSeq: this.inputSeq,
            outputSeq: this.outputSeq,
            msgLength: byteBuffer.limit,
            encoding: 0,
            reserved: 0,
            payLoad: byteBuffer.buffer
        }
        return message;
    }

    // 用户键盘输入，或粘贴输入；如果粘贴输入内容较长，需要分片发送
    onInput = (input: string | Buffer): boolean => {
        const data: ByteBuffer = ByteBuffer.wrap(input, "utf8");
        if (data.capacity() === 0) return false
        if (data.capacity() <= 1024) {
            const message = this.newMessage(MessageType.Input, data);
            return this.doWrite(message)
        }
        for (let i = 0; i < data.capacity(); i += 1024) {
            const size = Math.min(1024, data.capacity() - i)
            const slice = data.slice(i, i + size)
            const message = this.newMessage(MessageType.Input, slice);
            this.doWrite(message)
        }
    }

    // 在 WebSocket 上发送消息（用户输入、窗口Resize，或者同步状态）
    doWrite = (message: AxtMessage, callback?: (error?: Error | null) => void): boolean => {
        if (this.state.status !== "opened" && this.state.status !== "closing") {
            return false
        }
        if (!this.webSocket || !this.webSocket.OPEN) {
            console.warn("%s channel connection broken", this.instanceId);
            this.putStatus("closed");
            return false;
        }
        const bytes: ByteBuffer = encodeMessage(message)
        console.log("channel write: %s ...", this.instanceId, print(message))
        this.webSocket.send(bytes.buffer)
        if (message.msgType == MessageType.Input || message.msgType == MessageType.Resize) {
            this.inputQueue.push(message)
        }
        this.lastAlive = Date.now()
        return true
    }

    doResize = (): boolean => {
        if (this.state.status != "opened") {
            return false
        }
        console.debug("[%s] (%s) resize %d x %d",
            this.instanceId, this.state.status, this.cols, this.rows
        )
        if (this.webSocket && this.webSocket.OPEN) {
            const byteBuffer = new ByteBuffer(4)
            byteBuffer.littleEndian = true
            byteBuffer.writeInt16(this.rows)
            byteBuffer.writeInt16(this.cols)
            const message = this.newMessage(MessageType.Resize, byteBuffer)
            return this.doWrite(message)
        }
        return false
    }

    // 关闭 WebSocket 连接
    doCloseWss = (statusCode: number, reason: string) => {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer)
            this.idleTimer = undefined
        }
        if (this.webSocket) {
            if (this.webSocket.OPEN) {
                console.info("%s close websocket for %s ...", this.instanceId, reason)
                this.webSocket.close(statusCode, reason)
            }
            this.webSocket = undefined
        }
    }

    // 处理 WebSocket 连接建立事件
    onWssOpen = (event: Event) => {
        console.info("%s session web socket opened", this.instanceId)
        if (this.channelId || this.lifeCycle > 1) {
            console.info("%s sync i/o: %d/%d ...", this.instanceId, this.inputSeq, this.outputSeq);
            const sync = this.newMessage(MessageType.Sync, ByteBuffer.allocate(0));
            this.doWrite(sync) // tell agent to check seq
        }
    }

    // 处理 WebSocket 上接收到的消息
    onWssData = (data: MessageEvent) => {
        const msg: AxtMessage = decodeMessage(data.data)
        if (this.lifeCycle <= 1 && !this.channelId) {
            this.channelId = msg.channelId;
        }
        console.log("channel read: %s", print(msg))
        switch (msg.msgType) {
            case MessageType.Output: // 实例内Shell终端的输出
                if (!this.agentVersion) {
                    this.agentVersion = msg.version;
                    console.log("%s agent version: %s", this.instanceId, msg.version)
                }
                if (!this.compareSeqNumber(msg)) {
                    return;
                }
                this.outputSeq = msg.outputSeq;
                if (this.state.status == "opening") {
                    this.putStatus("opened")
                }
                const output = Buffer.from(msg.payLoad);
                this.terminal.write(output)
                if (this.outputSeq <= 1) {
                    this.doResize()
                }
                return;
            case MessageType.Sync: // 会话管理服务器或Agent的消息SEQ同步
                let count = 0;
                for (let i = 0; i < this.inputQueue.length; i++) {
                    const item = this.inputQueue[i];
                    if (i == 0 && item.inputSeq > msg.inputSeq) {
                        console.warn("%s message not found where inputSeq = %d", this.instanceId, msg.inputSeq)
                        return false;
                    }
                    if (item.inputSeq >= msg.inputSeq) {
                        console.info("%s channel re-send input message: %d", this.instanceId, print(item))
                        this.doWrite(this.inputQueue[i], undefined)
                        count++;
                    }
                }
                return;
            case MessageType.Status: // 会话连接状态更新
                const data = ByteBuffer.wrap(msg.payLoad);
                const state = data.readUint8()
                const reason = data.readString(msg.msgLength - 1)
                switch (state) {
                    case ChannelState.Initial: // 0
                        this.putStatus("prepare")
                        break
                    case ChannelState.Aborted: // 2
                        this.putStatus("aborted")
                        this.doCloseWss(StatusCode.NORMAL, reason)
                        break
                    case ChannelState.Opening: // 1
                        this.putStatus("opening")
                        break
                    case ChannelState.Opened: // 3
                        this.putStatus("opened")
                        break
                    case ChannelState.Closing: // 4
                        this.putStatus("closing")
                        break
                    case ChannelState.Closed:  // 5
                    case ChannelState.Exited:  // 6
                        this.putStatus("closed")
                        this.doCloseWss(StatusCode.NORMAL, reason)
                        break
                    case ChannelState.Stream: // 7
                        let streamLimit: number = 0;
                        for (let i = 1; i < msg.msgLength; i++) {
                            streamLimit <<= 8
                            streamLimit += msg.payLoad.at(i)!
                        }
                        this.bandWidth = streamLimit
                        break
                    case ChannelState.Frozen:  // 8
                        this.putStatus("closing")
                        this.doCloseWss(StatusCode.SERVICE_RESTART, reason)
                        break
                    default:
                }
                return true
            default:
                return true
        }
    }

    // 处理 WebSocket 连接异常事件
    onWssError = (error: Event) => {
        console.warn("%s wss socket error: %s.", this.instanceId, error)
        this.putStatus("aborted")
        this.doCloseWss(StatusCode.ABNORMAL, "ClientSocketClosed") // 1006
    }

    // 处理 WebSocket 连接关闭事件
    onWssClose = (event: CloseEvent) => {
        console.info("%s wss socket closed, i/o: %d/%d, code: %d, reason: (%s)",
            this.instanceId, this.inputSeq, this.outputSeq, event.code, event.reason
        )
        this.doCloseWss(event.code, event.reason)
        switch (event.code) {
            case StatusCode.SERVICE_RESTART: // 1023: 会话管理服务器即将重启
            case StatusCode.NO_CODE:         // 1005: 会话管理服务器意外重启
                this.putStatus("closing")
                setTimeout(this.openChannel.bind(this), 1000)
                break
            case StatusCode.NO_CLOSE:        // 1006
            case StatusCode.SHUTDOWN:        // 1001
            default:
                this.putStatus("closed")
                break
        }
    }

    // 比较收到的消息的 InputSeq/OutputSeq是否与本地的一致，如果有消息丢失则需要补发
    compareSeqNumber = (message: AxtMessage): boolean => {
        if (message.outputSeq < this.outputSeq + 1) {
            console.warn("%s ignore output: [%d]", this.instanceId, message.outputSeq)
        }
        if (message.outputSeq > this.outputSeq + 1) {
            console.warn("%s missed output from [%d]", this.instanceId, this.outputSeq)
            const sync = this.newMessage(MessageType.Sync, ByteBuffer.allocate(0));
            this.doWrite(sync) // tell agent to re-send outputs
            return false;
        }
        // remove messages in local queue before message.inputSeq or equals
        while (this.inputQueue.length > 0 && this.inputQueue[0].inputSeq <= message.inputSeq) {
            const input = this.inputQueue.shift()
            console.debug("%s shift input in queue: [%d], left: %s",
                this.instanceId, input?.inputSeq, this.inputQueue.length
            )
        }
        return true;
    }

    // 打开 WebSocket 连接，可能是首次连接，或因服务器重启而重新连接以恢复会话
    openChannel = (webSocketUrl?: string) => {
        if (!webSocketUrl) {
            webSocketUrl = this.socketUrl;
            if (this.channelId) {
                this.lifeCycle++ // 断开重连后，尝试恢复原会话内容
                webSocketUrl += "&channelId=" + this.channelId
            }
        }

        this.webSocket = new WebSocket(webSocketUrl!)
        this.webSocket.binaryType = "arraybuffer";
        this.webSocket.addEventListener("open", this.onWssOpen.bind(this))
        this.webSocket.addEventListener("message", this.onWssData.bind(this))
        this.webSocket.addEventListener("error", this.onWssError.bind(this))
        this.webSocket.addEventListener("close", this.onWssClose.bind(this))

        this.terminal.write(term.hideCursor())
        if (this.lifeCycle <= 1) { // 首次连接，启用倒计时，超时后停止计数
            this.terminal.write(term.saveCursorPosition());
            this.startCountdown();
        }
    }

    startCountdown = (): void => {
        this.counting = true
        const msg = this.statusLine()
        this.terminal.write(term.restoreCursorPosition() + term.restartLine() + msg)
        setTimeout(this.connecting.bind(this), 1000)
    }

    clearCountdown = (status: Status): void => {
        const msg = this.statusLine(status)
        if (this.counting) {
            this.terminal.write(term.restoreCursorPosition() + term.restartLine())
            this.counting = false
        }
        this.terminal.write(msg)
    }

    connecting = (): void => {
        if (this.state.status === "opening") {
            if (--this.spinWait > 0) {
                this.startCountdown()
            } else {
                this.terminal.write(this.statusLine("aborted"))
                this.putStatus("aborted")
                this.doCloseWss(StatusCode.SHUTDOWN, "ClientSocketClosed")
                this.putStatus("closed")
            }
        }
    }

    statusLine = (status?: Status): string => {
        const vm = this.state.instance!
        // noinspection TypeScriptValidateTypes
        const host = this.chalk.cyan(vm.instanceId) + '(' + this.chalk.cyan(vm.instanceName) + ')'
        const spin = "\\-/|".at(this.spinWait % 4) || "•"
        status = status ?? this.state.status
        switch (status) {
            case "prepare":
                return ""
            case "opening":
                // noinspection TypeScriptValidateTypes
                return `[${this.chalk.cyan(spin)}] ${host} ${this.chalk.dim('正在连接')} ...`
            case "aborted":
                // noinspection TypeScriptValidateTypes
                return `[${this.chalk.yellow('x')}] ${host} ${this.chalk.dim('连接终止')}\r\n\r\n`
            case "opened":
                // noinspection TypeScriptValidateTypes
                return `[${this.chalk.green('o')}] ${host} ${this.chalk.dim('连接成功')}\r\n\r\n`
            case "closed":
                return `会话关闭。\r\n`
            case "closing":
            case "exited":
            default:
                return ""
        }
    }

    autoFit = (): void => {
        this.getTermSize();
        this.terminal.resize(this.cols, this.rows);
        this.doResize();
    }

    debounceResize = debounce(100, this.autoFit.bind(this))

    getTermSize(): void {
        const dims = this.terminal["_core"]?.["_renderService"]?.["dimensions"]
        let cellHeight: number = dims?.actualCellHeight ?? this.fontSize + 2
        let cellWidth: number = dims?.actualCellWidth ?? this.fontSize * 0.6 + 0.01
        const paddingSize: number = 0  // terminal.padding: 0px;
        const scrollWidth: number = 16 // webkit-scrollbar.width
        const height = this.container!.clientHeight - 2 * paddingSize
        const width = this.container!.clientWidth - 2 * paddingSize - scrollWidth
        this.cols = Math.floor(width / cellWidth)
        this.rows = Math.floor(height / cellHeight)
        console.log("terminal: %d x %d (%d x %d) [fontSize: %s]", this.cols, this.rows, width, height, this.fontSize)
    }

    startTerminalSession = () => {
        const url = `/api/${this.productId}/regions/${this.regionId}/assistants?instanceId=${this.instanceId}`
        axios.get(url).then(response => {
            if (this.productId == "ecs") {
                const status = response.data.instanceCloudAssistantStatusSet[0];
                if (!status || !status.supportSessionManager) {
                    this.terminal.write(`[x] 此实例的云助手(${status.cloudAssistantVersion})不支持会话管理.\r\n`)
                    return
                }
            } else if (this.productId == "swas") {
                const status = response.data.cloudAssistantStatus[0];
                if (!status || !status.status) {
                    this.terminal.write(`[x] 此实例的云助手(${status.cloudAssistantVersion})不支持会话管理.\r\n`)
                    return
                }
            }
            const url = `/api/${this.productId}/sessions/${this.regionId}/instances/${this.instanceId}`
            axios.put(url).then(session => { // ecs:StartTerminalSession 返回结果
                this.putStatus("opening", () => {
                    this.socketUrl = session.data.webSocketUrl
                    this.openChannel()
                })
            }).catch(error => {
                this.terminal.write(`[x] StartTerminalSession 请求失败:\r\n`)
                this.terminal.write(`  RequestId: ${error.response.data.requestId}\r\n`)
                this.terminal.write(`  ErrorCode: ${error.response.data.errorCode}\r\n`)
                this.terminal.write(`  ErrorMsg : ${error.response.data.errorInfo}\r\n`)
            })
        })
    }

    componentDidMount() {
        this.container = document.getElementById("terminal");
        this.terminal.open(this.container)
        this.terminal.write(term.hideCursor());

        this.getTermSize()
        this.terminal.resize(this.cols, this.rows)

        this.terminal.onData(this.onInput.bind(this));

        window.addEventListener("resize", () => {
            this.debounceResize()
        })

        const type = this.instanceId.startsWith("mi-") ? "managed-instances" : "instances"
        const info = `/api/${this.productId}/regions/${this.regionId}/${type}/${this.instanceId}`
        this.terminal.write(`[-] 正在查询实例[${this.instanceId}]的信息与状态...\r\n`)
        axios.get(info).then(detail => { // 查询实例信息，TODO：检查实例的云助手在线状态
            if (detail.data.instances.length == 0) {
                this.terminal.write(`[x] 未找到此实例[${this.instanceId}/${this.regionId}]\r\n`);
                return;
            }
            const instance = detail.data.instances[0]
            // noinspection TypeScriptValidateTypes
            this.setState({instance: instance})
            this.terminal.write(`[o] 实例名称: ${instance.instanceName}\r\n`)
            if (this.instanceId.startsWith("mi-")) {
                if (instance.connected) {
                    const ip: string[] = instance.networkInterfaces.map(eni => eni.primaryIpAddress)
                    this.terminal.write(`[o] 私网地址: ${ip.join(", ")}\r\n`)
                    this.terminal.write(`[o] 云助手状态: 在线。\r\n`)
                } else {
                    this.terminal.write(`[o] 私网地址: ${instance.intranetIp}\r\n`)
                    this.terminal.write(`[o] 云助手状态: 离线。\r\n`)
                    return;
                }
            } else {
                this.terminal.write(`[o] 实例状态: ${instance.status}。\r\n`)
                if ("Running" != instance.status) {
                    this.terminal.write(`[x] 实例状态非Running，无法连接。\r\n`)
                    return;
                }
            }
            this.startTerminalSession();
        })
    }

    render() {
        return (
            <div style={{background: "black", fontSize: this.fontSize, height: "100%"}}>
                <div style={{position: "absolute", top: 20, right: 50, zIndex: 1000}}>
                    <Button>{this.state.status}</Button>
                </div>
                <div id="terminal" style={{
                    width: "100%",
                    height: "100%",
                    overflowX: "hidden",
                    overflowY: "scroll"
                }}/>
            </div>
        )
    }
}