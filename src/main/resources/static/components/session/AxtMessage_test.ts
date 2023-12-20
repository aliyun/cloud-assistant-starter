import {AxtMessage, ChannelState, MessageType, print} from "./AxtMessage";
import Long from "long";
import ByteBuffer from "bytebuffer";

const data : Uint8Array = new TextEncoder().encode("pwd")

function createMessage(type: MessageType, data: Uint8Array) {
    const message: AxtMessage = new AxtMessage();
    message.msgType = type
    message.version = "1.02"
    message.channelId = "d-channel"
    message.instanceId = "i-instance"
    message.timestamp = Long.fromNumber(Date.now())
    message.inputSeq = 1
    message.outputSeq = 0
    message.msgLength = data.length
    message.encoding = 0
    message.reserved = 0
    message.payLoad = data
    return message;
}

const msg_input = createMessage(MessageType.Input, data)
console.log(print(msg_input))
console.log(ByteBuffer.wrap(msg_input.payLoad).toString("hex"))

const msg_output = createMessage(MessageType.Output, data)
console.log(print(msg_output))
console.log(ByteBuffer.wrap(msg_output.payLoad).toString("hex"))

const msg_resize = createMessage(MessageType.Resize, Uint8Array.of(0, 98, 0, 100))
console.log(print(msg_resize))
console.log(ByteBuffer.wrap(msg_resize.payLoad).toString("hex"))

const msg_status = createMessage(MessageType.Status, Uint8Array.of(ChannelState.Opened, 97, 98, 99, 100))
console.log(print(msg_status))
console.log(ByteBuffer.wrap(msg_status.payLoad).toString("hex"))

