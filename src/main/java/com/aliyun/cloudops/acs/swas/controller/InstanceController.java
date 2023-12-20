package com.aliyun.cloudops.acs.swas.controller;

import java.util.Arrays;
import java.util.List;

import com.alibaba.fastjson.JSON;
import com.aliyun.cloudops.acs.AcsController;
import com.aliyuncs.ecs.model.v20140526.DescribeInstancesRequest;
import com.aliyuncs.ecs.model.v20140526.DescribeInstancesResponse;
import com.aliyuncs.ecs.model.v20140526.DescribeRegionsResponse;
import com.aliyuncs.exceptions.ClientException;
import com.aliyuncs.swas_open.model.v20200601.DescribeCloudAssistantStatusRequest;
import com.aliyuncs.swas_open.model.v20200601.DescribeCloudAssistantStatusResponse;
import com.aliyuncs.swas_open.model.v20200601.ListInstancesRequest;
import com.aliyuncs.swas_open.model.v20200601.ListInstancesResponse;
import com.aliyuncs.swas_open.model.v20200601.ListRegionsRequest;
import com.aliyuncs.swas_open.model.v20200601.ListRegionsResponse;
import com.aliyuncs.swas_open.model.v20200601.ListRegionsResponse.Region;
import com.aliyuncs.swas_open.model.v20200601.StartTerminalSessionRequest;
import com.aliyuncs.swas_open.model.v20200601.StartTerminalSessionResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController("SwasController")
@RequestMapping("/api/swas")
public class InstanceController extends AcsController {

    @GetMapping("/regions")
    public ResponseEntity<RegionsResponse> getRegions() throws ClientException {
        String current = this.acsClient.getRegionId();
        ListRegionsRequest request = new ListRegionsRequest();
        request.setSysRegionId(current);
        request.setSysEndpoint(String.format("swas.%s.aliyuncs.com", current));
        ListRegionsResponse response = this.acsClient.sendRequest(request);
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

    @GetMapping("/regions/{regionId}/instances")
    public ResponseEntity<ListInstancesResponse> getInstances(
            @PathVariable(name = "regionId") String regionId,
            @RequestParam(name = "pageSize", defaultValue = "20") int pageSize,
            @RequestParam(name = "pageIndex", defaultValue = "1") int pageIndex
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        ListInstancesRequest request = new ListInstancesRequest();
        request.setSysEndpoint(String.format("swas.%s.aliyuncs.com", regionId));
        request.setSysRegionId(regionId);
        request.setPageSize(pageSize);
        request.setPageNumber(pageIndex);
        ListInstancesResponse response = this.acsClient.sendRequest(request);
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
        request.setSysEndpoint(String.format("swas.%s.aliyuncs.com", regionId));
        request.setSysRegionId(regionId);
        request.setInstanceIds(Arrays.asList(instanceIds));
        DescribeCloudAssistantStatusResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/regions/{regionId}/instances/{instanceId}")
    public ResponseEntity<ListInstancesResponse> getInstance(
            @PathVariable(name = "regionId") String regionId,
            @PathVariable(name = "instanceId") String instanceId
    ) throws ClientException {
        if ("default".equals(regionId)) {
            regionId = this.acsClient.getRegionId();
        }
        ListInstancesRequest request = new ListInstancesRequest();
        request.setSysEndpoint(String.format("swas.%s.aliyuncs.com", regionId));
        request.setSysRegionId(regionId);
        request.setInstanceIds(JSON.toJSONString(new String[]{instanceId}));
        ListInstancesResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    /**
     * <pre>
     * 使用 StartTerminalSession 发起新的会话连接
     * https://next.api.aliyun.com/document/SWAS-OPEN/2020-06-01/StartTerminalSession
     * </pre>
     *
     * @param regionId   -
     * @param instanceId -
     * @param portNumber -
     * @return
     * @throws com.aliyuncs.exceptions.ClientException
     */
    @PutMapping("/sessions/{regionId}/instances/{instanceId}")
    public ResponseEntity<StartTerminalSessionResponse> startSession(
            @PathVariable("regionId") String regionId,
            @PathVariable("instanceId") String instanceId,
            @RequestParam(name = "portNumber", required = false) Integer portNumber
    ) throws ClientException {
        StartTerminalSessionRequest request = new StartTerminalSessionRequest();
        request.setSysEndpoint(String.format("swas.%s.aliyuncs.com", regionId));
        request.setSysRegionId(regionId);
        request.setInstanceId(instanceId);
        StartTerminalSessionResponse response = this.acsClient.sendRequest(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
