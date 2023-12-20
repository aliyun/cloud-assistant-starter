package com.aliyun.cloudops.acs.ecs.controller;

import com.aliyun.cloudops.acs.AcsController;
import com.aliyun.cloudops.acs.ecs.toolkit.CloudAssistant;
import com.aliyun.cloudops.service.TaskService;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeInvocationsResponse;
import com.aliyuncs.ecs.model.v20140526.RunCommandRequest;
import com.aliyuncs.ecs.model.v20140526.RunCommandResponse;
import com.aliyuncs.exceptions.ClientException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController()
@RequestMapping("/api/ecs")
public class CommandController extends AcsController {

    @Autowired
    private CloudAssistant cloudAssistant;

    @GetMapping("/task/{regionId}/invocations")
    public ResponseEntity<DescribeInvocationsResponse> listInvocations(
            @PathVariable String regionId,
            @RequestParam(name = "pageIndex", defaultValue = "1") long pageIndex,
            @RequestParam(name = "pageSize", defaultValue = "20") long pageSize
    ) throws ClientException {
        DescribeInvocationsRequest request = new DescribeInvocationsRequest();
        request.setSysRegionId(regionId);
        request.setPageNumber(pageIndex);
        request.setPageSize(pageSize);
        DescribeInvocationsResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PutMapping("/regions/{regionId}/invocations")
    public ResponseEntity<RunCommandResponse> invoke(@RequestBody RunCommandRequest request) throws ClientException {
        RunCommandResponse response = this.cloudAssistant.runCommand(request, true);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
