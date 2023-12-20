package com.aliyun.cloudops.service;

import java.util.List;

import com.aliyun.cloudops.domain.OpsTask;
import com.aliyun.cloudops.domain.OpsTaskItem;
import org.springframework.data.domain.Page;

public interface TaskService {

    void saveTask(OpsTask opsTask, List<OpsTaskItem> items);

    void saveTaskItem(OpsTaskItem taskItem);

    Page<OpsTask> findTasks(int pageSize, int pageNumber);

    OpsTask findTask(String invokeId);

    List<OpsTaskItem> findTaskItems(String invokeId);

    OpsTaskItem findTaskItem(String invokeId, String instanceId);

}
