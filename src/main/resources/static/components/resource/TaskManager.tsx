import React from "react";
import {Alert, Card, Drawer, Layout, Space, Table, theme, Typography} from "antd";
import AcsResources, {AcsResourcesState} from "./AcsResources";
import axios from "axios/index";

type Task = {
    invokeId: string,
    taskName: string,
    status: string,
    instances: number
}

type TaskItem = {
    instanceId: string,
    status: string,
    exitCode: number | undefined,
    output: string,
    errorCode: string,
    errorInfo: string
}

interface TaskManagerState extends AcsResourcesState {
    operations: any[];
    openedTask?: Task;
    taskItems: TaskItem[];
}

/**
 * 运维操作记录
 */
export default class TaskManager extends AcsResources<TaskManagerState> {

    constructor(props: {}) {
        super(props);
        this.state = {
            regionId: "default",
            regions: [],
            operations: [],
            pageNum: 1,
            total: 0,
            loading: false,
            updated: 0,
            openedTask: undefined,
            taskItems: []
        }
    }

    productCode(): string {
        return "task";
    }

    resourceName(): string {
        return "运维记录";
    }

    loadResources(regionId: string, pageIndex: number = 1, pageSize: number = 20): void {
        const url = `/api/ecs/tasks?pageIndex=${pageIndex}&pageSize=${pageSize}`
        axios.get(url).then(response => {
            // noinspection TypeScriptValidateTypes
            this.setState({
                operations: response.data.elements,
                total: response.data.totalCount,
                loading: false,
                updated: Date.now()
            })
        })
    }

    getColumns(): ColumnsType<any>[] {
        return [
            {
                key: "invokeId", title: "任务ID/名称", dataIndex: "invokeId", render: (text: string, task: any) => {
                    return (
                        <div>
                            <div>{task.invokeId}</div>
                            <a onClick={() => this.listTaskItems(task)}>{task.taskName}</a>
                        </div>
                    )
                }
            },
            {
                key: "status", title: "执行状态", dataIndex: "status", render: (text: string, task: Task) => {
                    return <a onClick={() => this.listTaskItems(task)}>{text}</a>
                }
            },
            {
                key: "regionId", title: "实例地域", dataIndex: "regionId", render: (text: string, task: Task) => {
                    return <div>{text}</div>
                }
            },
            {
                key: "commandText", title: "命令内容", dataIndex: "commandText", render: (text: string, task: Task) => {
                    return <Alert type="info" message={text}/>
                }
            },
            {
                key: "instances", title: "目标实例", dataIndex: "instances", render: (count: string, task: Task) => {
                    return <a onClick={() => this.listTaskItems(task)}>{count}</a>
                }
            },
            {
                key: "creationTime", title: "创建时间", dataIndex: "creationTime", render: (text: string) => {
                    return <div>{text}</div>
                }
            },
            {
                key: "finishTime", title: "结束时间", dataIndex: "finishTime", render: (text: string) => {
                    return <div>{text}</div>
                }
            },

        ];
    }

    listTaskItems = (task: Task) => {
        const taskItems: TaskItem[] = []
        for (let i = 0; i < task.instances; i++) {
            taskItems.push({
                instanceId: "",
                status: "",
                exitCode: undefined,
                output: "",
                errorCode: "",
                errorInfo: ""
            })
        }
        // noinspection TypeScriptValidateTypes
        this.setState({openedTask: task, taskItems: taskItems}, () => {
            const url = `/api/ecs/tasks/${task.invokeId}`
            axios.get(url).then(response => {
                // noinspection TypeScriptValidateTypes
                this.setState({taskItems: response.data})
            })
        })
    }

    getDataRows(): any[] {
        return this.state.operations.map((task: { invokeId: string }) => {
            return {
                key: task.invokeId,
                ...task,
            }
        });
    }

    closeTaskDetail = () => {
        // noinspection TypeScriptValidateTypes
        this.setState({openedTask: undefined, taskItems: []})
    }

    componentDidMount() {
        // noinspection TypeScriptValidateTypes
        this.setState({loading: true}, () => {
            this.loadResources("default", this.state.pageNum, this.pageSize)
        })
    }

    render() {
        const {openedTask, taskItems} = this.state;
        const colorBgContainer = theme.defaultConfig.token.colorBgBase
        return (
            <Layout style={{padding: '0 24px'}}>
                <Layout.Content style={{padding: "12px 0px", margin: 0, height: "100%", background: colorBgContainer}}>
                    <div style={{height: "100%", overflowY: "scroll"}}>
                        <Table size={"small"} style={{maxHeight: "100%"}}
                               loading={this.state.loading}
                               columns={this.getColumns()}
                               dataSource={this.getDataRows()}
                               rowSelection={{
                                   type: "checkbox"
                               }}
                               pagination={{
                                   pageSize: this.pageSize,
                                   total: this.state.total,
                                   defaultCurrent: this.state.pageNum,
                                   onChange: (pageIndex, pageSize) => {
                                       this.loadResources(this.state.regionId, pageIndex, pageSize)
                                   }
                               }}
                        />
                    </div>
                    <Drawer title={openedTask?.invokeId} placement="right" size="large"
                            open={openedTask != undefined} onClose={this.closeTaskDetail}
                    >
                        <table className="task-info-table">
                            <colgroup>
                                <col width="108"/>
                            </colgroup>
                            <tr>
                                <td>任务 ID:</td>
                                <td><Typography.Text code copyable>{openedTask?.invokeId}</Typography.Text></td>
                            </tr>
                            <tr>
                                <td>任务名称:</td>
                                <td><Typography.Text code copyable>{openedTask?.taskName}</Typography.Text></td>
                            </tr>
                            <tr>
                                <td>任务状态:</td>
                                <td><Typography.Text code copyable>{openedTask?.status}</Typography.Text></td>
                            </tr>
                        </table>
                        <Space direction="vertical" size={16}>
                            {taskItems.map(item => (
                                <Card key={item.instanceId} size="small"
                                      title={<div>{item.instanceId} - <a>{item.status}</a></div>}
                                      style={{minWidth: 666}} bodyStyle={{padding: 0}}
                                      loading={item.instanceId.length == 0}
                                >
                                    <div style={{background: "black", color: "white", padding: "1px 12px"}}>
                                        <pre>{item.output}</pre>
                                    </div>
                                </Card>
                            ))}
                        </Space>
                    </Drawer>
                </Layout.Content>
            </Layout>
        )
    }
}