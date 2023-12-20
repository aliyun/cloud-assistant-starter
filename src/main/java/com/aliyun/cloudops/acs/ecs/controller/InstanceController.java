package com.aliyun.cloudops.acs.ecs.controller;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.alibaba.fastjson.JSON;
import com.aliyun.cloudops.acs.AcsController;
import com.aliyuncs.ecs.model.v20140526.DescribeCloudAssistantStatusRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeCloudAssistantStatusResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeInstancesRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeInstancesResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeManagedInstancesRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeManagedInstancesResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeRegionsRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeRegionsResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeRegionsResponse.Region;
import com.aliyuncs.ecs.model.v20140526.StartTerminalSessionRequest;
import com.aliyuncs.ecs.model.v20140526.StartTerminalSessionResponse;
import com.aliyuncs.exceptions.ClientException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController("EcsController")
@RequestMapping("/api/ecs")
public class InstanceController extends AcsController {
    /**
     * <pre>
     * 使用 DescribeRegions 查询帐号的可用地域
     * https://next.api.aliyun.com/document/Ecs/2014-05-26/DescribeRegions
     * </pre>
     *
     * @return
     * @throws ClientException
     */
    @GetMapping("/regions")
    public ResponseEntity<RegionsResponse> getRegions() throws ClientException {
        DescribeRegionsRequest request = new DescribeRegionsRequest();
        DescribeRegionsResponse response = this.acsClient.sendRequest(request);
        String current = this.acsClient.getRegionId();
        List<Region> regions = response.getRegions();
        RegionsResponse result = new RegionsResponse(current, regions);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    public static class RegionsResponse {
        private final String current;
        private final List<Region> regions;

        public RegionsResponse(String regionId, List<Region> regions) {
            this.current = regionId;
            this.regions = regions;
        }

        public String getCurrent() {
            return current;
        }

        public List<Region> getRegions() {
            return regions;
        }
    }

    /**
     * <pre>
     * 使用 DescribeInstances 查询帐号的实例列表
     * https://next.api.aliyun.com/document/Ecs/2014-05-26/DescribeInstances
     * </pre>
     *
     * @param regionId  -
     * @param nextToken -
     * @param maxResult -
     * @return
     * @throws ClientException
     */
    @GetMapping("/regions/{regionId}/instances")
    public ResponseEntity<DescribeInstancesResponse> getInstances(
            @PathVariable(name = "regionId") String regionId,
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(name = "pageIndex", defaultValue = "1") int pageIndex
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        DescribeInstancesRequest request = new DescribeInstancesRequest();
        request.setSysRegionId(regionId);
        request.setPageSize(pageSize);
        request.setPageNumber(pageIndex);
        DescribeInstancesResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/regions/{regionId}/instances/{instanceId}")
    public ResponseEntity<DescribeInstancesResponse> getInstance(
            @PathVariable(name = "regionId") String regionId,
            @PathVariable(name = "instanceId") String instanceId
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        DescribeInstancesRequest request = new DescribeInstancesRequest();
        request.setSysRegionId(regionId);
        request.setInstanceIds(JSON.toJSONString(new String[]{instanceId}));
        DescribeInstancesResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/regions/{regionId}/assistants")
    public ResponseEntity<DescribeCloudAssistantStatusResponse> getCloudAssistants(
            @PathVariable(name = "regionId") String regionId,
            @RequestParam(name = "instanceId") String[] instanceIds
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        DescribeCloudAssistantStatusRequest request = new DescribeCloudAssistantStatusRequest();
        request.setSysRegionId(regionId);
        request.setInstanceIds(Arrays.asList(instanceIds));
        DescribeCloudAssistantStatusResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/regions/{regionId}/managed-instances")
    public ResponseEntity<DescribeManagedInstancesResponse> getManagedInstances(
            @PathVariable(name = "regionId") String regionId,
            @RequestParam(name = "pageSize", defaultValue = "20") long pageSize,
            @RequestParam(name = "pageIndex", defaultValue = "1") long pageIndex
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        DescribeManagedInstancesRequest request = new DescribeManagedInstancesRequest();
        request.setSysRegionId(regionId);
        request.setPageSize(pageSize);
        request.setPageNumber(pageIndex);
        DescribeManagedInstancesResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/regions/{regionId}/managed-instances/{instanceId}")
    public ResponseEntity<DescribeManagedInstancesResponse> getManagedInstances(
            @PathVariable(name = "regionId") String regionId,
            @PathVariable(name = "instanceId") String instanceId
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        DescribeManagedInstancesRequest request = new DescribeManagedInstancesRequest();
        request.setSysRegionId(regionId);
        request.setInstanceIds(Collections.singletonList(instanceId));
        DescribeManagedInstancesResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    /**
     * <pre>
     * 使用 StartTerminalSession 发起新的会话连接
     * https://next.api.aliyun.com/document/Ecs/2014-05-26/StartTerminalSession
     * </pre>
     *
     * @param regionId   -
     * @param instanceId -
     * @param portNumber -
     * @return
     * @throws ClientException
     */
    @PutMapping("/sessions/{regionId}/instances/{instanceId}")
    public ResponseEntity<StartTerminalSessionResponse> startSession(
            @PathVariable("regionId") String regionId,
            @PathVariable("instanceId") String instanceId,
            @RequestParam(name = "portNumber", required = false) Integer portNumber
    ) throws ClientException {
        StartTerminalSessionRequest request = new StartTerminalSessionRequest();
        request.setSysRegionId(regionId);
        request.setInstanceIds(Collections.singletonList(instanceId));
        request.setPortNumber(portNumber);
        StartTerminalSessionResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

}
