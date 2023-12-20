package com.aliyun.cloudops.repository;

import com.aliyun.cloudops.domain.OpsTask;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<OpsTask, Long> {

    OpsTask findByInvokeId(String invokeId);

}
