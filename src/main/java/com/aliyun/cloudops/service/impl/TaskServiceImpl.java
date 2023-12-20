package com.aliyun.cloudops.service.impl;

import java.util.List;

import com.aliyun.cloudops.domain.OpsTask;
import com.aliyun.cloudops.domain.OpsTaskItem;
import com.aliyun.cloudops.repository.TaskItemRepository;
import com.aliyun.cloudops.repository.TaskRepository;
import com.aliyun.cloudops.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class TaskServiceImpl implements TaskService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskItemRepository taskItemRepository;

    @Override
    public void saveTask(OpsTask opsTask, List<OpsTaskItem> items) {
        this.taskRepository.saveAndFlush(opsTask);
        for (OpsTaskItem item : items) {
            this.taskItemRepository.saveAndFlush(item);
        }
    }

    @Override
    public void saveTaskItem(OpsTaskItem taskItem) {
        this.taskItemRepository.saveAndFlush(taskItem);
    }

    @Override
    public Page<OpsTask> findTasks(int pageSize, int pageNumber) {
        Sort sort = Sort.by("id").descending();
        Pageable pageable = PageRequest.of(pageNumber - 1, pageSize, sort);
        return this.taskRepository.findAll(pageable);
    }

    @Override
    public OpsTask findTask(String invokeId) {
        return this.taskRepository.findByInvokeId(invokeId);
    }

    @Override
    public List<OpsTaskItem> findTaskItems(String invokeId) {
        return this.taskItemRepository.findByInvokeId(invokeId);
    }

    @Override
    public OpsTaskItem findTaskItem(String invokeId, String instanceId) {
        return this.taskItemRepository.findByInvokeIdAndInstanceId(invokeId, instanceId);
    }


}