# 使用说明

## 内容介绍：
  - 本项目包含了使用阿里云云助手执行命令的工具类 ```CloudAssistant.java```与使用示例，该工具类可以帮助你处理调用云助手 RunCommand
    与 DescribeInvocation(Result)s 时需要处理的多个复杂问题，实现快速接入云助手进行自动化运维。
  - 本项目包含了使用阿里云会话管理的完整示例程序 ```AxtSession.tsx```，您可以参考该类的代码，实现在自己的应用中集成云服务器的会话管理
    远程登录功能。

1. 使用云助手发送命令的最佳实践
> 关于云助手：云助手是专为云服务器ECS打造的原生自动化运维接口, 通过云助手可以向云服务器发送和执行命令，实现服务器自动化运维、批量运维、定时运维等。
> 更多介绍：<https://help.aliyun.com/zh/ecs/user-guide/overview-10>

相关工具类：```com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant```，主要方法：
  - checkCloudAssistant: 检查 RunCommand 请求参数是否合法，以及所指定的实例的云助手运行状态是否正常。
  - runCommand/invokeCommand: 发起一次 RunCommand/InvokeCommand 请求，自动带有请求幂等与请求重试。
  - waitForTaskFinish/waitForTaskStatus：自动轮询，并同步等待至指定的任务完成，或到过符合期望的状态。
  - scheduleTaskQuery：提交一个任务状态轮询任务，该方法将以恰当的间隔，使用线程池轮询，以减少系统的开销。

2. 接入云助手会话管理的参考代码

> 关于会话管理：会话管理（Session Manager）是由云助手提供的服务器远程连接功能，可以免公网、免密码远程登录Linux与Windows主机。
> 会话管理介绍： <https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-session-manager>

相关工具类：```AxtSession.tsx```，您可以通过运行本项目，体验会话管理的免公网、免密码远程登录到云服务器的功能。
也可以参考```AxtSession.tsx```类的代码，实现在自己的应用服务内，集成会话管理的远程登录功能。AxtSession 工作过程介绍：
  - 调用 ecs:StartTerminalSession 接口（<https://next.api.aliyun.com/document/Ecs/2014-05-26/StartTerminalSession>），
    生成一个可连接到指定主机的临时的 WebSocket 连接地址；
  - 连接上一步获得的 WebSocket 地址，并且在该连接上接收实例内的Shell终端的输出，以及发送用户的终端输入。在该WebSocket传输的
    数据格式，请见 ```AxtMessage```类。
  - ```AxtSession```类包含了建立WebSocket连接，接WebSocket上的输出并解码显示到终端，编码和发送用户的键盘输入内容，处理WebSocket
    的连接变化、输入输出数据的校验、连接状态检测与自动重连等功能。
  - 示例程序```AxtSession```使用NodeJS开发，程序运行在浏览器内；您也可以使用其他语言开发，在后端服务上建立WebSocket与处理输出/输入数据。

> 关于托管实例：如果你期望能够自动化运维线下或其他云上的主机，发送命令或远程连接，可通过在该主机上安装云助手Agent， 将该主机“托管”到阿里云云助手。
> 非阿里云主机托管到云助手之后，可以使用阿里云提供的云助手发送命令与远程登录、以及阿里云的运维编排、云效、云监控、弹性伸缩等线上服务。
> 托管实例介绍：<https://help.aliyun.com/zh/ecs/user-guide/manage-servers-that-are-not-provided-by-alibaba-cloud>

## 编译与启动

### 应用配置

1. [**必选**] 配置阿里云 AccessKey
> 配置文件位置: ./antx.properties
```yaml
acs.profile.regionId     = cn-hangzhou
acs.profile.accessKeyId  = <您的AccessKeyId>
acs.profile.accessSecret = <您的AccessSecret>
acs.profile.ramRoleArm   = <可选的RamRoleArn>
```
> 帮助：如何获取 AccessKey: <https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey-pair>

2. [可选] 配置本地 HTTP 端口
> 配置文件位置: ./antx.properties
```yaml
server.port = 8888
```

3. [可选] 配置本地数据库 

默认使用了H2内存数据库，如果您需要持久保存数据，请修改数据库相关配置：
> 配置文件位置: ./antx.properties
```yaml
spring.datasource.url      = jdbc:h2:mem:cloudops
spring.datasource.username = sa
spring.datasource.password = sa
spring.datasource.driver   = org.h2.Driver
```

### 代码编译
4. [**必选**] 前端编译

前端部分使用 TypeScript + ReactJS + Antd5 + WebPack 开发，代码库中不包含有编译产物 bundle.js. 
您需要准备 NodeJS 开发环境，并编译生成的 bundle.js 文件。

编译命令：
```shell
npm install && webpack
```

5. [**必选**]  后端编译
前端部分使用 JAVA 语言开发，可以使用 maven 编译代码；

```shell
## use maven
mvn clean package
```

### 启动项目
```shell
## use maven
mvn spring-boot:run
```

#### 查看示例
启动项目后，可以通过 http://localhost:8888 查看本演示程序。

#### [可选]前后端分离
你可以分别启动后端与前端
1. 启动后端： ```mvn spring-boot:run```
2. 启动前端： ```npx webpack serve```
3. 访问应用： ```http://localhost:9000```

### 问题咨询
如果您在使用中遇到了问题，可以向阿里云提交工单，或在本项目的开源代码库提交问题。
