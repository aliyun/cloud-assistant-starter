package com.aliyun.cloudops;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping()
public class CloudOpsController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/{resource}")
    public String home(
            @PathVariable(name = "resource", required = false) String resource
    ) {
        return "index";
    }

    @GetMapping("/session/axt")
    public String axtSession(
            @RequestParam(name = "regionId") String regionId,
            @RequestParam(name = "instanceId") String instanceId
    ) {
        return "../index";
    }
}