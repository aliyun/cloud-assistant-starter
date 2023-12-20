package com.aliyun.cloudops;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication(scanBasePackages = {
        "com.aliyun.cloudops"
})
@EnableAspectJAutoProxy(proxyTargetClass = true)
@EnableCaching
public class CloudOpsApplication {

    protected static final Logger logger = LoggerFactory.getLogger(CloudOpsApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(CloudOpsApplication.class, args);
    }
}
