import ByteBuffer from 'bytebuffer'
import Long from "long"

/**
 * 云助手会话管理 WebSocket 消息的消息类型
 */
export enum MessageType {
    Input = 0,   // Client->Server only
    Output = 1,  // Server->Client only
    Resize = 2,  // Client->Server only
    Close = 3,   // Client->Server only
    Open = 4,    // Client->Server only
    Status = 5,  // Server->Client only
    Sync = 6,    // 双向可以发送，同步状态
}

/**
 * 云助手会话管理 WebSocket 消息的状态枚举
 */
export enum ChannelState {
    Initial = 0,
    Opening = 1,
    Aborted = 2,
    Opened = 3,
    Closing = 4,
    Closed = 5,
    Exited = 6,
    Stream = 7,
    Frozen = 8,
}

/**
 * 云助手SessionManager会话连接WebSocket上的数据内容
 */
export class AxtMessage {
    msgType: MessageType  // 4 bytes
    version: string       // 4 bytes
    instanceId: string    // 1 bytes + content
    channelId: string     // 1 bytes + content
    timestamp: Long       // 8 bytes
    inputSeq: number      // 4 bytes
    outputSeq: number     // 4 bytes
    msgLength: number     // 2 bytes
    encoding: number      // 1 bytes
    reserved: number      // 1 bytes
    payLoad: Uint8Array   // {{msgLength}}
}

/**
 * 从会话管理 WebSocket 二进制 Message 中反序列化出 AxtMessage 实例
 * @param bytes
 */
export function decodeMessage(bytes: Uint8Array): AxtMessage {
    const buffer = ByteBuffer.wrap(bytes, false, true)
    buffer.littleEndian = true

    const message = new AxtMessage();
    message.msgType = buffer.readUint32()
    message.version = buffer.readString(4)

    const len1 = buffer.readUint8()
    message.channelId = len1 === 0 ? "" : buffer.readString(len1)

    const len2 = buffer.readUint8()
    message.instanceId = len2 === 0 ? "" : buffer.readString(len2)

    message.timestamp = buffer.readUint64()
    message.inputSeq = buffer.readUint32()
    message.outputSeq = buffer.readUint32()

    message.msgLength = buffer.readUint16()
    message.encoding = buffer.readUint8()
    message.reserved = buffer.readUint8()
    message.payLoad = buffer.toBuffer(true)
    return message;
}

/**
 * 将会话管理 AxtMessage 实例序列化为二进制的 WebSocket Message
 * @param message
 */
export function encodeMessage(message: AxtMessage): ByteBuffer {
    const len1 = message.channelId.length
    const len2 = message.instanceId.length
    const len3 = message.payLoad.byteLength
    const total = 30 + len1 + len2 + len3

    let buffer: ByteBuffer = ByteBuffer.allocate(total, true)
    buffer.littleEndian = true
    buffer.writeInt32(message.msgType)
    buffer.writeString(message.version)

    buffer.writeUint8(len1)
    if (len1 > 0) {
        buffer.writeString(message.channelId)
    }

    buffer.writeUint8(len2)
    if (len2 > 0) {
        buffer.writeString(message.instanceId)
    }

    buffer.writeLong(message.timestamp.toNumber())
    buffer.writeUint32(message.inputSeq)
    buffer.writeUint32(message.outputSeq)

    buffer.writeUint16(message.msgLength)
    buffer.writeUint8(message.encoding)
    buffer.writeUint8(message.reserved)
    buffer.append(message.payLoad)
    return buffer
}

export function display(status: ChannelState): string {
    switch (status) {
        case ChannelState.Initial:
            return "Initial"
        case ChannelState.Opening:
            return "Opening"
        case ChannelState.Opened:
            return "Opened"
        case ChannelState.Aborted:
            return "Aborted"
        case ChannelState.Closing:
            return "Closing"
        case ChannelState.Closed:
            return "Closed"
        case ChannelState.Exited:
            return "Exit"
        case ChannelState.Frozen:
            return "Frozen"
        case ChannelState.Stream:
            return "Stream"
        default:
            return `${status}`
    }
}

export function print(message: AxtMessage, text: boolean = true): string {
    switch (message.msgType) {
        case MessageType.Input:
            const input = getString(message.payLoad, text)
            return `[Input ${message.inputSeq}:${message.outputSeq} (${message.msgLength})'${input}']`;
        case MessageType.Output:
            const output = getString(message.payLoad, text)
            return `[Output ${message.inputSeq}:${message.outputSeq} (${message.msgLength})'${output}']`;
        case MessageType.Resize:
            if (message.payLoad.length == 4) {
                const size = ByteBuffer.wrap(message.payLoad).toString("hex")
                return `[Resize ${message.inputSeq}:${message.outputSeq} (${message.msgType})${size}]`;
            } else {
                const json = new TextDecoder().decode(message.payLoad);
                return `[Resize ${message.inputSeq}:${message.outputSeq} (${message.msgLength})${json}]`;
            }
        case MessageType.Status:
            const buffer = ByteBuffer.wrap(message.payLoad)
            const status = display(buffer.readUint8())
            if (status == "Stream") {
                const limit = buffer.readUint32()
                return `[Status ${message.inputSeq}:${message.outputSeq} (${status})${limit}]`;
            } else {
                const prompt = buffer.readString(message.msgLength - 1)
                return `[Status ${message.inputSeq}:${message.outputSeq} (${status})${prompt}]`;
            }
        case MessageType.Sync:
            return `[Sync ${message.inputSeq}:${message.outputSeq}]`;
        default:
            const data = getString(message.payLoad, text)
            return `[${message.msgType} ${message.inputSeq}:${message.outputSeq} (${message.msgLength})${data}]`;
    }
}

function getString(payLoad: Uint8Array, text: boolean): string {
    return text ? new TextDecoder().decode(payLoad) : ByteBuffer.wrap(payLoad).toString("hex")
}