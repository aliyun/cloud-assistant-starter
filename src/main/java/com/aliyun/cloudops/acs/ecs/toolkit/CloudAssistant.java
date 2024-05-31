package com.aliyun.cloudops.acs.ecs.toolkit;


import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;

import com.aliyun.cloudops.acs.AcsClient;
import com.aliyuncs.ecs.model.v20140526.DescribeCloudAssistantStatusRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeCloudAssistantStatusResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeCloudAssistantStatusResponse.InstanceCloudAssistantStatus;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsResponse.Invocation;
import com.aliyuncs.ecs.model.v20140526.InvokeCommandRequest;
import com.aliyuncs.ecs.model.v20140526.InvokeCommandResponse;
import com.aliyuncs.ecs.model.v20140526.RunCommandRequest;
import com.aliyuncs.ecs.model.v20140526.RunCommandResponse;
import com.aliyuncs.exceptions.ClientException;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

/**
 * <pre>
 * ECS云助手API辅助工具类，用于帮助用户向ECS实例发送命令、发送文件，
 * 以及轮询任务的结果，并通过使用线程池等方式，优化轮询的时机与请求数。
 * </pre>
 */
@Component
public class CloudAssistant {

    /**
     * 云助手命令类型
     */
    public enum CommandType {
        RunShellScript,     // 仅适用于Linux实例
        RunBatScript,       // 仅适用于Windows实例
        RunPowerShellScript // 仅适用于Windows实例
    }

    /**
     * 云助手调度模式
     */
    public enum RepeatMode {
        Once,               // 立即运行
        Period,             // 周期运行、定时运行
        EveryReboot,        // 每次开机自动运行
        NextRebootOnly,     // 开机自动运行一次
    }

    /**
     * 云助手任务状态
     */
    public enum InvocationStatus {
        Pending,    // 系统调度处理中，
        Running,    // 命令运行中,
        Success,    // 命令运行全部成功，且ExitCode为0
        Failed,     // 命令运行全部失败：下发失败，或执行失败。详见原因请见 ErrorInfo 字段。
        PartialFailed, // 部分失败，仅当批量向多个ECS实例发送命令时，才会具有这个状态。
        Stopping,   // 正在停止（用户正通过过 StopInvocation 停止该任务）
        Stopped,    // 已停止： 用户通过 StopInvocation 中止了该任务。
        Scheduled;  // 等待调度（立即运行的任务，不会有这个状态）

        public boolean isFinished() {
            switch (this) {
                case Success:
                case Failed:
                case PartialFailed:
                case Stopped:
                    return true;
                default:
                    return false;
            }
        }
    }

    /**
     * 阿里云OpenAPI的Java SDK客户端
     */
    private final AcsClient acsClient;

    /**
     * 云助手任务状态轮询使用的线程池核心线程池大小。请根据业务量
     * 的并发数量与密集程度，设置合适的线程池数量值。
     */
    @Value("${com.aliyun.cloudops.axt.corePoolSize:3}")
    private int corePoolSize = 10;

    /**
     * 云助手任务状态轮询的最小间隔，以秒为单元。请根据业务对时效
     * 的敏感程序设置适当的大小。注意过小的间隔，可能会在待查询的
     * 任务数较多时，产生过多的请求，导致超出OpenAPI限流值。ECS
     * 的多数API的默认限制值为 1000次/分钟/帐号。
     */
    @Value("${com.aliyun.cloudops.axt.taskQueryDelay:3}")
    private int taskQueryDelay = 3;

    private ScheduledThreadPoolExecutor threadPoolExecutor;

    private static final String OS_LINUX = "Linux";
    private static final String OS_WINDOWS = "Windows";

    private static final String STATUS_OK = "true";

    private static final Logger logger = LoggerFactory.getLogger(CloudAssistant.class);

    public CloudAssistant(AcsClient acsClient) {
        this.acsClient = acsClient;
    }

    @PostConstruct
    public void init() {
        // 初始化任务轮询的线程池调度器
        this.threadPoolExecutor = new ScheduledThreadPoolExecutor(
                this.corePoolSize,
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    /**
     * 向指定的在一台或多台ECS实例中执行一段Shell、PowerShell或者Bat类型的脚本。
     * RunCommand 文档： https://next.api.aliyun.com/document/Ecs/2014-05-26/RunCommand
     *
     * @param request             - RunCommand 请求
     * @param checkCloudAssistant - 详见方法 {@link CloudAssistant#checkCloudAssistant(RunCommandRequest)}
     * @return
     * @throws ClientException
     */
    public RunCommandResponse runCommand(RunCommandRequest request, boolean checkCloudAssistant) throws ClientException {
        if (checkCloudAssistant && !this.checkCloudAssistant(request)) {
            return null;
        }
        if (StringUtils.isEmpty(request.getClientToken())) { // 添加幂等Token
            request.setClientToken(UUID.randomUUID().toString());
        }
        return this.acsClient.sendRequest(request);
    }

    public InvokeCommandResponse invokeCommand(InvokeCommandRequest request) throws ClientException {
        if (StringUtils.isEmpty(request.getClientToken())) { // 添加幂等Token
            request.setClientToken(UUID.randomUUID().toString());
        }
        return this.acsClient.sendRequest(request);
    }

    /**
     * 检查ECS实例上的云助手运行状态，及操作系统是否匹配命令类型。若存在操作系统不匹配命令类型，则返回 false;
     * 若ECS实例的系统类型是Linux，则仅应当发送Type为RunShellScript的请求；
     * 若ECS实例的系统类型是Windows，则支持Type为RunBatShell和RunPowerShell类型的请求。
     *
     * @param request - RunCommand 请求
     * @return - 检查通过则为 true, 否则为 false.
     */
    public boolean checkCloudAssistant(RunCommandRequest request) throws ClientException {
        List<String> instanceIds = request.getInstanceIds().stream()
                .filter(StringUtils::isNotEmpty).distinct() // 去除空白或重复的ECS实例ID
                .collect(Collectors.toList());
        request.setInstanceIds(instanceIds);

        // 相关API：https://next.api.aliyun.com/document/Ecs/2014-05-26/DescribeCloudAssistantStatus
        DescribeCloudAssistantStatusRequest describe = new DescribeCloudAssistantStatusRequest();
        describe.setSysRegionId(request.getSysRegionId());
        describe.setInstanceIds(instanceIds);
        DescribeCloudAssistantStatusResponse response = this.acsClient.sendRequest(describe);
        List<InstanceCloudAssistantStatus> statusSet = response.getInstanceCloudAssistantStatusSet();

        if (CommandType.RunShellScript.name().equals(request.getType())) {
            // RunShellScript 类型的命令，不支持在 Windows 实例上执行
            if (statusSet.stream().anyMatch(vm -> OS_WINDOWS.equalsIgnoreCase(vm.getOSType()))) {
                logger.error("{} request is not allowed for Windows system.", request.getType());
                return false;
            }
        } else {
            if (statusSet.stream().anyMatch(vm -> OS_LINUX.equalsIgnoreCase(vm.getOSType()))) {
                logger.error("{} request is not allowed for Linux system.", request.getType());
                return false;
            }
        }

        statusSet.forEach(vm -> {
            // ECS实例上没有云助手，或云不在运行中，极有可能无法将该命令发送到ECS实例上并执行。
            // 安装云助手，见：https://help.aliyun.com/zh/ecs/user-guide/install-the-cloud-assistant-agent
            // 排查云助手异常： https://help.aliyun.com/zh/ecs/user-guide/configure-network-permissions-for-the-cloud-assistant-agent
            if (StringUtils.isEmpty(vm.getCloudAssistantVersion())) {
                logger.warn("instance {} cloud assistant not installed.", vm.getInstanceId());
            } else if (!STATUS_OK.equals(vm.getCloudAssistantStatus())) {
                logger.info("instance {} cloud assistant not running.", vm.getInstanceId());
            }
        });
        return true;
    }

    /**
     * <pre>
     * 同步等待云助手任务执行完成。任务的可能状态见： {@link CloudAssistant#isFinished(String)}
     * 或参考API文档： https://next.api.aliyun.com/document/Ecs/2014-05-26/DescribeInvocations
     * </pre>
     *
     * @param regionId - 任务所在地域
     * @param invokeId - 任务的唯一ID
     * @param timeout  - 等待的超时时间，推荐使用：命令Timeout + min(1分钟，命令Timeout）+ 10 秒
     * @return - 任务的执行结果
     * @throws InterruptedException
     */
    public Invocation waitForTaskFinish(String regionId, String invokeId, int timeout) throws InterruptedException {
        return this.waitForTaskStatus(regionId, invokeId, timeout, invocation -> isFinished(invocation.getInvocationStatus()));
    }

    private Invocation waitForTaskStatus(String regionId, String invokeId, int timeout, Predicate<Invocation> predicate) throws InterruptedException {
        AtomicReference<Invocation> result = new AtomicReference<>();
        final CountDownLatch countDownLatch = new CountDownLatch(1);
        this.scheduleTaskQuery(regionId, invokeId, invocation -> {
            if (predicate.test(invocation)) {
                result.set(invocation);
                countDownLatch.countDown();
                return true;
            } else {
                return false;
            }
        });
        if (timeout > 0) {
            countDownLatch.await(timeout, TimeUnit.SECONDS);
        } else {
            countDownLatch.await();
        }
        return result.get();
    }

    /**
     * 异步等待云助手任务执行完成，并执行回调程序。使用异步等待与回调时，不会阻止调用方的当前工作线程。
     *
     * @param regionId - 任务所在地域
     * @param invokeId - 任务的唯一ID
     * @param callback - 回调处理函数，若该方法返回 false 则轮询线程池还将继续轮询；否则停止轮询。
     */
    public void scheduleTaskQuery(String regionId, String invokeId, Predicate<Invocation> callback) {
        this.threadPoolExecutor.schedule(new TaskQuery(regionId, invokeId, callback), 1, TimeUnit.SECONDS);
    }

    /**
     * 判断任务的执行状态是否为已结束。
     *
     * @param invocationStatus - 任务的执行状态
     * @return - 任务执行已到达终态，状态不会再产生变化。
     */
    public static boolean isFinished(String invocationStatus) {
        if (invocationStatus == null) {
            return false; // 非法的入参
        }

        InvocationStatus status;
        try {
            status = InvocationStatus.valueOf(invocationStatus);
            return status.isFinished();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 一个命令调用的状态查询任务。该查询将自动根据命令Timeout时长，选择较适当的查询间隔。
     * 该查询间隔的选择，即能减少不必要的查询请求数，也能在任务完成后较早获取结果。
     */
    public class TaskQuery implements Runnable {
        private final DescribeInvocationsRequest request;
        private final Predicate<Invocation> predicate;
        private int queryTimes = 0;

        /**
         * @param regionId  - 任务所在地域
         * @param invokeId  - 任务的唯一ID
         * @param predicate - 回调函数
         */
        public TaskQuery(String regionId, String invokeId, Predicate<Invocation> predicate) {
            this.request = new DescribeInvocationsRequest();
            request.setSysRegionId(regionId);
            request.setInvokeId(invokeId);
            request.setContentEncoding("PlainText"); // 默认"Base64"
            request.setIncludeOutput(true);
            this.predicate = predicate;
        }

        @Override
        public void run() {
            try {
                this.queryTimes++;
                DescribeInvocationsResponse response = acsClient.sendRequest(request);
                if (CollectionUtils.isEmpty(response.getInvocations())) {
                    logger.error("query task {}-[{}], not found.", request.getInvokeId(), queryTimes);
                    predicate.test(null); // 提供的入参有误，请检查 regionId与InvokeId
                    return;
                }
                Invocation invocation = response.getInvocations().get(0);
                if (this.predicate.test(invocation) || isFinished(invocation.getInvocationStatus())) {
                    return;
                }
                DateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
                Date creationTime = format.parse(invocation.getCreationTime()); // GMT 时间
                long startTime = creationTime.getTime() + TimeZone.getDefault().getRawOffset();

                long finalTime = startTime + 1000 * invocation.getTimeout();
                // 计算当前时间与最晚结束时间的差值，每对过一半再查，避免产生过量无效查询
                long nextStep = (finalTime - System.currentTimeMillis()) / 2;
                nextStep = Math.max(taskQueryDelay * 1000L, nextStep); // 防止负数或间隔过小

                // 任务创建之后的第60秒，是任务下发的最晚截止时间点。在此时间查询一次可尽早发现可能的失败
                long checkPoint = startTime + 1000 * Math.min(60, invocation.getTimeout());
                long offsetTime = checkPoint - System.currentTimeMillis();
                if (0 < offsetTime && offsetTime < nextStep) {
                    nextStep = offsetTime; // 下一次查询时间，不要跳过CheckPoint
                }
                long during = (System.currentTimeMillis() - startTime) / 1000;
                logger.info("query task {}-[{}]+{}s, next: {}ms.", request.getInvokeId(), queryTimes, during, nextStep);
                threadPoolExecutor.schedule(this, nextStep, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                logger.warn("query task {}-[{}], error: {}.", request.getInvokeId(), queryTimes, e, e);
                threadPoolExecutor.schedule(this, 1, TimeUnit.SECONDS);
            }
        }
    }

}