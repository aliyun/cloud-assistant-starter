import React from "react";
import axios from "axios";
import {Button, Dropdown, Space, Tooltip} from "antd";
import DownOutlined from "@ant-design/icons/DownOutlined"
import AcsResources, {ABOUT_SESSION_MANAGER, AcsResourcesState} from "./AcsResources";

interface AmiInstancesState extends AcsResourcesState {
    instances: any[];
}

/**
 * 托管实例列表
 */
export default class AmiInstances extends AcsResources<AmiInstancesState> {

    constructor(props: {}) {
        super(props);
        this.state = {
            regionId: "default",
            regions: [],
            instances: [],
            pageNum: 1,
            total: 0,
            loading: false,
            updated: 0
        }
    }

    productCode(): string {
        return "ecs";
    }

    resourceName(): string {
        return "托管实例";
    }

    loadResources(regionId: string, pageIndex: number = 1, pageSize: number = 20) {
        const url = `/api/ecs/regions/${regionId}/managed-instances?pageIndex=${pageIndex}&pageSize=${pageSize}`
        axios.get(url).then(response => {
            // noinspection TypeScriptValidateTypes
            this.setState({
                instances: response.data.instances,
                total: response.data.totalCount,
                loading: false,
                updated: Date.now(),
            })
            return response.data.instances;
        })
    }

    getColumns = () => {
        return [
            {
                key: "instanceId", title: "实例ID/名称", dataIndex: "instanceId", render: (text: string, vm: any) => {
                    return (
                        <div>
                            <div>{vm.instanceId}</div>
                            <a>{vm.hostname}</a>
                        </div>
                    )
                }
            },
            {
                key: "osType", title: "系统类型", dataIndex: "osType", render: (value: string, vm: any) => {
                    return <div>{value}</div>
                }
            },
            {
                key: "intranetIp", title: "私网IP", dataIndex: "intranetIp", render: (value: string, vm: any) => {
                    return (
                        <div>
                            <a>{value}</a>
                        </div>
                    )
                }
            },
            {
                key: "internetIp", title: "公网IP", dataIndex: "internetIp", render: (value: string, vm: any) => {
                    return (
                        <div>
                            <a>{value}</a>
                        </div>
                    )
                }
            },
            {
                key: "registrationTime",
                title: "注册时间",
                dataIndex: "registrationTime",
                render: (value: string, vm: any) => {
                    return (
                        <div>
                            <div>{value}</div>
                        </div>
                    )
                }
            },
            {
                key: "cloudAssist", title: "云助手", dataIndex: "connected", render: (online: boolean, vm: any) => {
                    if (online) {
                        return <Tooltip title={`版本：${vm.agentVersion}`}><a style={{color: "green"}}>在线</a></Tooltip>
                    } else {
                        return <Tooltip title={`版本：${vm.agentVersion}`}><a style={{color: "orange"}}>离线</a></Tooltip>
                    }
                }
            },
            {
                key: "actions", title: "操作", dataIndex: "connected", render: (online: boolean, vm: any) => {
                    const regionId = this.state.regionId;
                    const color = online ? "green" : "gray";
                    return (
                        <Space style={{minWidth: 120}}>
                            <Tooltip placement="left" overlayStyle={{minWidth: 300, maxWidth: 360}} title={(
                                <span>使用云助手的<a target="_blank" href={ABOUT_SESSION_MANAGER}>会话管理</a>功能，
                                    免公网、免密码，远程登录到服务器。(要求：本托管实例的云助手状态为在线)。
                                </span>
                            )}>
                                <Button disabled={!online} style={{color: color}} size="small" target="_blank"
                                        href={`/session/axt?productId=ecs&regionId=${regionId}&instanceId=${vm.instanceId}`}
                                >
                                    会话连接
                                </Button>
                            </Tooltip>
                            <Dropdown menu={{
                                items: this.getTaskMenus(!online),
                                onClick: (args) => {
                                    this.runCommand("ecs", vm, args)
                                }
                            }}>
                                <a onClick={e => e.preventDefault()}>
                                    <Space>更多操作<DownOutlined/></Space>
                                </a>
                            </Dropdown>
                        </Space>
                    )
                }
            },
        ]
    }

    getDataRows = () => {
        return this.state.instances.map((vm: { instanceId: string }) => {
            return {
                key: vm.instanceId,
                ...vm,
            }
        });
    }
}