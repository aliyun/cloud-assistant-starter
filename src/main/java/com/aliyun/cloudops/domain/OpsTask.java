package com.aliyun.cloudops.domain;

import java.util.Date;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.Table;

import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.CommandType;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.InvocationStatus;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.RepeatMode;

@Entity()
@Table(
        name = "ops_task",
        indexes = {
                @Index(name = "idx_invoke_id", columnList = "invoke_id"),
        }
)
public class OpsTask {

    @Id
    @Column(name = "id", updatable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "region_id", updatable = false)
    private String regionId;

    @Column(name = "task_name", updatable = false)
    private String taskName;

    @Column(name = "command_text", updatable = false)
    private String commandText;

    @Column(name = "parameters", updatable = false)
    private String parameters;

    @Column(name = "timeout", updatable = false)
    private long timeout;

    @Enumerated()
    @Column(name = "command_type", updatable = false)
    private CommandType commandType;

    @Enumerated()
    @Column(name = "repeat_mode", updatable = false)
    private RepeatMode repeatMode;

    @Column(name = "invoke_id", updatable = false)
    private String invokeId;

    @Enumerated()
    @Column(name = "status")
    private InvocationStatus status;

    @Column(name = "instances", updatable = false)
    private int instances;

    @Column(name = "creation_time", updatable = false)
    private Date creationTime;

    @Column(name = "finish_time")
    private Date finishTime;

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getRegionId() {
        return regionId;
    }

    public void setRegionId(String regionId) {
        this.regionId = regionId;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public String getCommandText() {
        return commandText;
    }

    public void setCommandText(String commandText) {
        this.commandText = commandText;
    }

    public String getParameters() {
        return parameters;
    }

    public void setParameters(String parameters) {
        this.parameters = parameters;
    }

    public long getTimeout() {
        return timeout;
    }

    public void setTimeout(long timeout) {
        this.timeout = timeout;
    }

    public CommandType getCommandType() {
        return commandType;
    }

    public void setCommandType(CommandType commandType) {
        this.commandType = commandType;
    }

    public RepeatMode getRepeatMode() {
        return repeatMode;
    }

    public void setRepeatMode(RepeatMode repeatMode) {
        this.repeatMode = repeatMode;
    }

    public String getInvokeId() {
        return invokeId;
    }

    public void setInvokeId(String invokeId) {
        this.invokeId = invokeId;
    }

    public int getInstances() {
        return instances;
    }

    public void setInstances(int instances) {
        this.instances = instances;
    }

    public InvocationStatus getStatus() {
        return status;
    }

    public void setStatus(InvocationStatus status) {
        this.status = status;
    }

    public Date getCreationTime() {
        return creationTime;
    }

    public void setCreationTime(Date creationTime) {
        this.creationTime = creationTime;
    }

    public Date getFinishTime() {
        return finishTime;
    }

    public void setFinishTime(Date finishTime) {
        this.finishTime = finishTime;
    }
}
