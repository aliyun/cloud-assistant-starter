import React from "react";
import {Breadcrumb, Layout, notification, Table, theme, Tooltip, Typography} from 'antd';
import {ColumnsType} from "antd/es/table/interface";
import {HomeOutlined} from "@ant-design/icons";
import axios from "axios";
import commands from "../commands.json"

const {Text} = Typography;

export interface AcsResourcesState {
    regionId: string;
    regions: { regionId: string, localName: string }[];
    pageNum: number;
    total: number;
    loading: boolean;
    updated: number;
}

export type TaskMenu = { key: string, name: string, tips: string, scripts: { [key: string]: string } };

// 云助手通过会话管理连接实例的官方文档
export const ABOUT_SESSION_MANAGER = "https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-session-manager"

// 阿里云资源列表
export default abstract class AcsResources<S extends AcsResourcesState> extends React.Component<{}, S> {

    protected pageSize: number = 20;

    protected constructor(props: {}) {
        super(props);
    }

    abstract productCode(): string

    abstract resourceName(): string

    abstract loadResources(regionId: string, pageIndex: number = 1, pageSize: number = 20): void

    abstract getColumns(): ColumnsType<any>;

    abstract getDataRows(): any[];

    getTaskMenus = (disable: boolean) => {
        return commands.map((menu: TaskMenu) => {
            return {
                key: menu.key,
                label: (
                    <Tooltip overlayStyle={{minWidth: "420px", width: "420px", maxWidth: "420px"}}
                             overlayInnerStyle={{width: "420px"}}
                             placement="left"
                             title={(
                                 <div>
                                     {menu.tips}
                                     在Linux上将执行<Text code copyable type="success">{menu.scripts["linux"]}</Text>命令；
                                     在Windows上将执行<Text code copyable type="success">{menu.scripts["windows"]}</Text>命令。
                                 </div>
                             )}>
                        <a>{menu.name}</a>
                    </Tooltip>
                ),
                disabled: disable,
            }
        })
    }

    runCommand = (vm: { instanceId: string }, args: { key: string }) => {
        let osType = "linux";
        if (vm.instanceId.startsWith("mi")) {
            if (vm.osType?.includes("Windows")) {
                osType = "windows"
            }
        } else {
            if (vm.ostype?.includes("windows")) {
                osType = "windows"
            }
        }
        const menu: TaskMenu = commands.filter(cmd => cmd.key == args.key)[0]
        const runCommandRequest = {
            regionId: this.state.regionId,
            name: menu.name,
            type: osType == "linux" ? "RunShellScript" : "RunBatScript",
            commandContent: menu.scripts[osType],
            contentEncoding: "PlainText",
            instanceIds: [vm.instanceId],
            timeout: 60,
            tags: [
                {
                    key: "cloudops-practice",
                    value: menu.key
                }
            ]
        }
        const url = `/api/ecs/tasks/${this.state.regionId}`
        axios.put(url, runCommandRequest).then(response => {
            notification.open({
                message: `已创建任务：${response.data.invokeId}`,
                description: (
                    <div>
                        <span>已创建任务：<a>{response.data.invokeId}</a></span>
                        <br/>
                        <span>请在<a href="/task" target="_self">运维记录</a>中查看此任务的执行进度</span>
                    </div>
                ),
                onClick: () => {
                    console.log('Notification Clicked!');
                },
            });
        })
    }

    renderBreadcrumb = () => {
        const regionName = this.state.regions.find(r => r.regionId == this.state.regionId)?.localName ?? "默认地域"
        const regionItems = this.state.regions.map(region => {
            return {
                key: region.regionId,
                label: region.localName,
                onClick: () => {
                    // noinspection TypeScriptValidateTypes
                    this.setState({
                        regionId: region.regionId,
                        pageNum: 1,
                        loading: true
                    }, () => {
                        this.loadResources(region.regionId, 1, this.pageSize)
                    })
                }
            }
        });
        return (
            <Breadcrumb style={{margin: "12px 0"}} items={[
                {
                    title: <HomeOutlined/>,
                },
                {
                    title: <a href="#">{regionName}</a>,
                    menu: {
                        items: regionItems,
                        selectedKeys: [this.state.regionId],
                        style: {
                            maxHeight: 480,
                            overflowY: "scroll"
                        },
                    }
                },
                {
                    title: this.resourceName(),
                },
            ]}/>
        )
    }

    componentDidMount() {
        const product = this.productCode();
        const url = `/api/${product}/regions`
        axios.get(url).then(response => {
            // noinspection TypeScriptValidateTypes
            this.setState({
                regionId: response.data.current,
                regions: response.data.regions,
                updated: Date.now()
            })
        })
        // noinspection TypeScriptValidateTypes
        this.setState({
            loading: true
        }, () => {
            this.loadResources("default", this.state.pageNum, this.pageSize)
        })
    }

    render() {
        const colorBgContainer = theme.defaultConfig.token.colorBgBase
        return (
            <Layout style={{padding: '0 24px'}}>
                {this.renderBreadcrumb()}
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
                </Layout.Content>
            </Layout>
        )
    }

}