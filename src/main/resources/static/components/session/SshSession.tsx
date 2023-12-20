import React from "react";
import axios from "axios";

interface SshSessionProps {
}

interface SshSessionState {
    instance: any | undefined
    status: string
}

// SSH 远程连接
export default class SshSession extends React.Component<SshSessionProps, SshSessionState> {

    private readonly regionId: string;
    private readonly instanceId: string

    constructor(props: SshSessionProps) {
        super(props);
        const search = new URLSearchParams(window.location.search)
        this.regionId = search.get("regionId") ?? ""
        this.instanceId = search.get("instanceId") ?? ""
        this.state = {
            status: "prepare",
            instance: undefined
        }
    }

    componentDidMount() {
        const type = this.instanceId.startsWith("mi-") ? "managed-instances" : "instances"
        const info = `/api/ecs/regions/${this.regionId}/${type}/${this.instanceId}`
        axios.get(info).then(detail => {
            // noinspection TypeScriptValidateTypes
            this.setState({
                instance: detail.data.instances[0]
            })
        })
    }
}