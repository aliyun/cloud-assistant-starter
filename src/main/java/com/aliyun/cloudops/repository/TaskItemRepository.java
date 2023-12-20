package com.aliyun.cloudops.repository;

import java.util.List;

import com.aliyun.cloudops.domain.OpsTaskItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskItemRepository extends JpaRepository<OpsTaskItem, Long> {

    List<OpsTaskItem> findByInvokeId(String invokeId);

    OpsTaskItem findByInvokeIdAndInstanceId(String invokeId, String instanceId);
}
