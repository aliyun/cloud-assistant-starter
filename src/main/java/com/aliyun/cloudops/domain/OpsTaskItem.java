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

import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant.InvocationStatus;

@Entity()
@Table(
        name = "ops_task_item",
        indexes = {
                @Index(name = "idx_invoke_id", columnList = "invoke_id"),
                @Index(name = "idx_instance_id", columnList = "instance_id"),
        }
)
public class OpsTaskItem {
    @Id
    @Column(name = "id", updatable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "region_id", updatable = false)
    private String regionId;

    @Column(name = "invoke_id", updatable = false)
    private String invokeId;

    @Column(name = "instance_id", updatable = false)
    private String instanceId;

    @Enumerated
    @Column(name = "status", nullable = false)
    private InvocationStatus status;

    @Column(name = "exit_code")
    private Long exitCode;

    @Column(name = "output")
    private String output;

    @Column(name = "dropped")
    private int dropped;

    @Column(name = "err_code")
    private String errorCode;

    @Column(name = "err_info")
    private String errorInfo;

    @Column(name = "creation_time", updatable = false)
    private Date creationTime;

    @Column(name = "update_time")
    private Date updateTime;

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

    public String getInvokeId() {
        return invokeId;
    }

    public void setInvokeId(String invokeId) {
        this.invokeId = invokeId;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }

    public InvocationStatus getStatus() {
        return status;
    }

    public void setStatus(InvocationStatus status) {
        this.status = status;
    }

    public Long getExitCode() {
        return exitCode;
    }

    public void setExitCode(Long exitCode) {
        this.exitCode = exitCode;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }

    public int getDropped() {
        return dropped;
    }

    public void setDropped(int dropped) {
        this.dropped = dropped;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorInfo() {
        return errorInfo;
    }

    public void setErrorInfo(String errorInfo) {
        this.errorInfo = errorInfo;
    }

    public Date getCreationTime() {
        return creationTime;
    }

    public void setCreationTime(Date creationTime) {
        this.creationTime = creationTime;
    }

    public Date getUpdateTime() {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime) {
        this.updateTime = updateTime;
    }

    public Date getFinishTime() {
        return finishTime;
    }

    public void setFinishTime(Date finishTime) {
        this.finishTime = finishTime;
    }
}
