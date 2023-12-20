import React from "react";
import axios from "axios";
import {Button, Dropdown, Space, Tooltip} from 'antd';
import DownOutlined from "@ant-design/icons/DownOutlined"
import AcsResources, {ABOUT_SESSION_MANAGER, AcsResourcesState} from "./AcsResources";

interface EcsInstancesState extends AcsResourcesState {
    instances: any[];
}

/**
 * 云服务器列表
 */
export default class EcsInstances extends AcsResources<EcsInstancesState> {

    assistants: Map<string, { cloudAssistantStatus: string, cloudAssistantVersion: string }> = new Map();

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
        return "云服务器";
    }

    loadResources(regionId: string, pageIndex: number = 1, pageSize: number = 20) {
        const url = `/api/ecs/regions/${regionId}/instances?pageIndex=${pageIndex}&pageSize=${pageSize}`
        axios.get(url).then(response => {
            // noinspection TypeScriptValidateTypes
            this.setState({
                instances: response.data.instances,
                total: response.data.totalCount,
                loading: false,
                updated: Date.now(),
            })
            return response.data.instances;
        }).then(instances => {
            if (instances.length == 0) return
            const query = instances.map((vm: any) => 'instanceId=' + vm.instanceId).join("&")
            const url = `/api/ecs/regions/${regionId}/assistants?${query}`;
            axios.get(url).then(result => {
                result.data.instanceCloudAssistantStatusSet.forEach((status: any) => {
                    this.assistants.set(status.instanceId, status)
                })
                // noinspection TypeScriptValidateTypes
                this.setState({
                    updated: Date.now()
                })
            })
        })
    }

    getColumns = () => {
        return [
            {
                key: "instanceId", title: "实例ID/名称", dataIndex: "instanceId", render: (text: string, vm: any) => {
                    return (
                        <div>
                            <div>{vm.instanceId}</div>
                            <a>{vm.instanceName}</a>
                        </div>
                    )
                }
            },
            {
                key: "ostype", title: "系统类型", dataIndex: "ostype", render: (type: string, vm: any) => {
                    return (
                        <Tooltip placement="left" title={vm["osname"] ?? vm["osnameEn"]}>
                            <span>{type}</span>
                        </Tooltip>
                    )
                }
            },
            {
                key: "status", title: "状态", dataIndex: "status", render: (status: string, vm: any) => {
                    const color = status == "Running" ? "green" : status == "Stopped" ? "gray" : "cyan"
                    return <span style={{color: color}}>{status}</span>
                }
            },
            {
                key: "instanceType", title: "实例类型", dataIndex: "instanceType", render: (spec: string, vm: any) => {
                    return (
                        <div>
                            <div>
                                <span style={{fontWeight: "bold"}}>{vm.cpu}</span>核(vCPU) &nbsp;
                                <span style={{fontWeight: "bold"}}>{vm.memory / 1024}</span>GiB
                            </div>
                            <div>{spec}</div>
                        </div>
                    )
                }
            },
            {
                key: "privateIp", title: "私网IP", dataIndex: "networkInterfaces", render: (enis: any[], vm: any) => {
                    return (
                        <div>
                            {enis.map(eni => <div key={eni.networkInterfaceId}><a>{eni.primaryIpAddress}</a></div>)}
                        </div>
                    )
                }
            },
            {
                key: "publicIp", title: "公网IP", dataIndex: "publicIpAddress", render: (address: string[], vm: any) => {
                    return (
                        <div>
                            <div>{address.map((ip: string) => <div key={ip}><a>{ip}</a></div>)}</div>
                            <div hidden={!vm.eipAddress.ipAddress}><a>{vm.eipAddress.ipAddress}</a>(弹性IP)</div>
                        </div>
                    )
                }
            },
            {
                key: "creationTime", title: "创建时间/到期时间", dataIndex: "creationTime", render: (v: string, vm: any) => {
                    return (
                        <div>
                            <div>{vm.creationTime}</div>
                            <div>{vm.expiredTime}</div>
                        </div>
                    )
                }
            },
            {
                key: "cloudAssist", title: "云助手", dataIndex: "cloudAssist", render: (_: any, vm: any) => {
                    const status = this.assistants.get(vm.instanceId)
                    if (!status) {
                        return <span>...</span>
                    } else {
                        if ("true" == status.cloudAssistantStatus) {
                            return <Tooltip title={`版本：${status.cloudAssistantVersion}`}><a
                                style={{color: "green"}}>在线</a></Tooltip>
                        } else if (status.cloudAssistantVersion) {
                            return <Tooltip title={`版本：${status.cloudAssistantVersion}`}><a
                                style={{color: "orange"}}>离线</a></Tooltip>
                        } else {
                            return <a style={{color: "gray"}}>未安装</a>
                        }
                    }
                }
            },
            {
                key: "actions", title: "操作", dataIndex: "actions", render: (_: any, vm: any) => {
                    const regionId = this.state.regionId;
                    const status = this.assistants.get(vm.instanceId)
                    const enable = status?.cloudAssistantStatus == "true"
                    const color = enable ? "green" : "gray";
                    return (
                        <Space style={{minWidth: 120}}>
                            <Tooltip placement="left" overlayStyle={{minWidth: 300, maxWidth: 360}} title={(
                                <span>使用云助手的<a target="_blank" href={ABOUT_SESSION_MANAGER}>会话管理</a>功能，
                                    免公网、免密码，远程登录到服务器。(要求：已开通会话管理功能，且本实例的云助手在线)。
                                </span>
                            )}>
                                <Button disabled={!enable} style={{color: color}} size="small" target="_blank"
                                        href={`/session/axt?productId=ecs&regionId=${regionId}&instanceId=${vm.instanceId}`}
                                >
                                    会话连接
                                </Button>
                            </Tooltip>
                            <Dropdown menu={{
                                items: this.getTaskMenus(!enable),
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