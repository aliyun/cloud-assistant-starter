import React from "react";
import {Link, Outlet} from "react-router-dom";
import {Layout, Menu, Space, theme} from 'antd';

interface PrimaryState {
    resource: string; // ecs | ami
}

export default class Primary extends React.Component<{}, PrimaryState> {

    constructor(props: PrimaryProps) {
        super(props);
        this.state = {
            resource: "ecs",
        }
    }

    renderSiderMenu = () => {
        const path = window.location.pathname
        return (
            <Menu
                mode="inline"
                defaultOpenKeys={['cloud-assist', path]}
                defaultSelectedKeys={['cloud-assist', path]}
                style={{height: '100%', borderRight: 0}}
                items={[
                    {
                        key: "cloud-assist",
                        label: "主机运维",
                        children: [
                            {
                                key: "/ecs",
                                label: <Link to="ecs">云服务器</Link>
                            },
                            {
                                key: "/ami",
                                label: <Link to="ami">托管实例</Link>
                            },
                            {
                                key: "/task",
                                label: <Link to="task">运维记录</Link>
                            }
                        ]
                    }
                ]}
            />
        )
    }

    render() {
        const colorBgContainer = theme.defaultConfig.token.colorBgBase
        return (
            <Layout style={{height: "100%"}}>
                <Layout.Header style={{display: "flex", alignItems: "center", padding: 0}}>
                    <div style={{color: "white", fontSize: "large", fontStyle: "bolder"}}>
                        <Space style={{margin: "0 48px"}}>弹性计算代码示例</Space>
                    </div>
                    <Menu theme="dark" mode="horizontal"
                          defaultSelectedKeys={["ecs"]}
                          items={[
                              {
                                  key: "ecs",
                                  label: "云服务器"
                              }
                          ]}/>
                </Layout.Header>
                <Layout>
                    <Layout.Sider width={240} style={{background: colorBgContainer}}>
                        {this.renderSiderMenu()}
                    </Layout.Sider>
                    <Outlet/>
                </Layout>
            </Layout>
        )
    }

}