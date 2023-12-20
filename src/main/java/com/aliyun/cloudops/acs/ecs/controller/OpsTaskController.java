package com.aliyun.cloudops.acs.ecs.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.function.Predicate;

import com.alibaba.fastjson.JSON;
import com.aliyun.cloudops.acs.AcsController;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.CommandType;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.InvocationStatus;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.RepeatMode;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.TaskQuery;
import com.aliyun.cloudops.domain.OpsTask;
import com.aliyun.cloudops.domain.OpsTaskItem;
import com.aliyun.cloudops.service.TaskService;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsResponse.Invocation;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsResponse.Invocation.InvokeInstance;
import com.aliyuncs.ecs.model.v20140526.RunCommandRequest;
import com.aliyuncs.ecs.model.v20140526.RunCommandResponse;
import com.aliyuncs.exceptions.ClientException;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.isFinished;

@RestController()
@RequestMapping("/api/ecs")
public class OpsTaskController extends AcsController implements Predicate<Invocation> {

    @Autowired
    private CloudAssistant cloudAssistant;

    @Autowired
    private TaskService taskService;

    @GetMapping("/tasks")
    public ResponseEntity<PageResult<OpsTask>> listInvocations(
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(name = "pageIndex", defaultValue = "1") int pageIndex
    ) {
        Page<OpsTask> page = this.taskService.findTasks(pageSize, pageIndex);
        return new ResponseEntity<>(new PageResult<>(page), HttpStatus.OK);
    }

    @GetMapping("/tasks/{invokeId:[-\\w]+}")
    public ResponseEntity<List<OpsTaskItem>> listTaskItems(
            @PathVariable("invokeId") String invokeId
    ) {
        List<OpsTaskItem> items = this.taskService.findTaskItems(invokeId);
        return new ResponseEntity<>(items, HttpStatus.OK);
    }

    @PutMapping("/tasks/{regionId:[-\\w]+}")
    public ResponseEntity<RunCommandResponse> runCommand(
            @PathVariable(name = "regionId") String regionId,
            @RequestBody RunCommandRequest request
    ) throws ClientException {
        request.setSysRegionId(regionId);
        if (request.getParameters() != null) {
            request.setEnableParameter(true);
        }
        // 使用云助手执行命令
        RunCommandResponse response = this.cloudAssistant.runCommand(request, true);
        String invokeId = response.getInvokeId();
        this.saveTask(request, response);

        // 创建一个异步的任务轮询任务，并在回调中处理查询到的结果
        this.cloudAssistant.scheduleTaskQuery(regionId, invokeId, this);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    private void saveTask(RunCommandRequest request, RunCommandResponse response) {
        CommandType commandType = CommandType.valueOf(request.getType());
        RepeatMode repeatMode = RepeatMode.Once;
        if (StringUtils.isNotEmpty(request.getRepeatMode())) {
            repeatMode = RepeatMode.valueOf(request.getRepeatMode());
        }

        // 将操作记录保存到自己的数据库中 (云助手的执行记录只保存4周)
        OpsTask opsTask = new OpsTask();
        opsTask.setRegionId(request.getSysRegionId());
        opsTask.setTaskName(request.getName());
        opsTask.setCommandType(commandType);
        opsTask.setCommandText(request.getCommandContent());
        if (request.getParameters() != null) {
            opsTask.setParameters(JSON.toJSONString(request.getParameters()));
        } else {
            opsTask.setParameters("{}");
        }
        if (request.getTimeout() != null) {
            opsTask.setTimeout(request.getTimeout());
        } else {
            opsTask.setTimeout(60);
        }
        opsTask.setRepeatMode(repeatMode);
        opsTask.setStatus(InvocationStatus.Pending);
        opsTask.setInvokeId(response.getInvokeId());
        opsTask.setInstances(request.getInstanceIds().size());
        // 保存每个实例上的命令执行状态、执行结果、退出码等
        List<OpsTaskItem> taskItemList = new ArrayList<>();
        for (String instanceId : request.getInstanceIds()) {
            OpsTaskItem opsTaskItem = new OpsTaskItem();
            opsTaskItem.setRegionId(request.getSysRegionId());
            opsTaskItem.setInvokeId(response.getInvokeId());
            opsTaskItem.setInstanceId(instanceId);
            opsTaskItem.setStatus(InvocationStatus.Pending);
            opsTaskItem.setOutput("");
            opsTaskItem.setErrorCode("");
            opsTaskItem.setErrorInfo("");
            opsTaskItem.setCreationTime(new Date());
            taskItemList.add(opsTaskItem);
        }
        opsTask.setCreationTime(new Date());
        this.taskService.saveTask(opsTask, taskItemList);
    }

    /**
     * {@link TaskQuery} 云助手任务轮询结果的回调处理
     *
     * @param invocation - 云助手任务
     * @return
     */
    @Override
    public boolean test(Invocation invocation) {
        if (invocation == null) {
            return false;
        }
        for (InvokeInstance instance : invocation.getInvokeInstances()) {
            if (isFinished(instance.getInvocationStatus())) {
                OpsTaskItem item = this.taskService.findTaskItem(
                        invocation.getInvokeId(),
                        instance.getInstanceId()
                );
                if (!item.getStatus().isFinished()) {
                    item.setStatus(InvocationStatus.valueOf(instance.getInvocationStatus()));
                    item.setOutput(instance.getOutput());
                    item.setDropped(instance.getDropped());
                    item.setExitCode(instance.getExitCode());
                    item.setErrorCode(instance.getErrorCode());
                    item.setErrorInfo(instance.getErrorInfo());
                    item.setUpdateTime(new Date());
                    item.setFinishTime(new Date());
                    this.taskService.saveTaskItem(item);
                }
            }
        }
        if (isFinished(invocation.getInvocationStatus())) {
            OpsTask task = this.taskService.findTask(invocation.getInvokeId());
            task.setFinishTime(new Date()); //TODO: use invocation.getFinishTime();
            task.setStatus(InvocationStatus.valueOf(invocation.getInvocationStatus()));
            this.taskService.saveTask(task, Collections.emptyList());
            return true;
        }
        return false;
    }

    public static class PageResult<T> {

        private final long totalCount;

        private final List<T> elements;

        public PageResult(Page<T> page) {
            this.totalCount = page.getTotalElements();
            this.elements = page.getContent();
        }

        public long getTotalCount() {
            return totalCount;
        }

        public List<T> getElements() {
            return elements;
        }
    }
}
