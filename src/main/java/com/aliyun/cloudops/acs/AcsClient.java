package com.aliyun.cloudops.acs;

import javax.annotation.PostConstruct;

import com.aliyuncs.AcsRequest;
import com.aliyuncs.AcsResponse;
import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.IAcsClient;
import com.aliyuncs.auth.sts.AssumeRoleRequest;
import com.aliyuncs.auth.sts.AssumeRoleResponse;
import com.aliyuncs.auth.sts.AssumeRoleResponse.Credentials;
import com.aliyuncs.exceptions.ClientException;
import com.aliyuncs.exceptions.ErrorType;
import com.aliyuncs.http.HttpClientConfig;
import com.aliyuncs.http.HttpClientType;
import com.aliyuncs.profile.DefaultProfile;
import com.aliyuncs.profile.IClientProfile;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AcsClient {

    @Value("${acs.profile.regionId:cn-hangzhou}")
    private String regionId;

    @Value("${acs.profile.accessKeyId}")
    private String accessKeyId;

    @Value("${acs.profile.accessSecret}")
    private String accessSecret;

    @Value("${acs.profile.ramRoleArn:#{null}}")
    private String ramRoleArn;

    /**
     * 阿里云OpenAPI请求可能会网络等原因导致偶然的失败，该参数
     * 用于控制请求重试的最多次数。
     */
    @Value("${acs.profile.maxReties:3}")
    private int maxRetry = 3;

    private IAcsClient rawClient;

    private IAcsClient roleClient;

    private long tokenExpireTime;

    private static final Logger logger = LoggerFactory.getLogger(AcsClient.class);

    @PostConstruct
    public void init() {
        IClientProfile rawProfile = DefaultProfile.getProfile(regionId, accessKeyId, accessSecret);
        HttpClientConfig httpClientConfig = new HttpClientConfig();
        httpClientConfig.setClientType(HttpClientType.ApacheHttpClient);
        httpClientConfig.setReadTimeoutMillis(10 * 1000L);
        rawProfile.setHttpClientConfig(httpClientConfig);
        this.rawClient = new DefaultAcsClient(rawProfile);
        this.tokenExpireTime = 0;
    }

    public String getRegionId() {
        return regionId;
    }

    public IAcsClient getAcsClient() throws ClientException {
        if (StringUtils.isEmpty(this.ramRoleArn)) {
            return this.rawClient;
        }
        if (System.currentTimeMillis() < tokenExpireTime) {
            return this.roleClient;
        }

        AssumeRoleRequest assumeRoleRequest = new AssumeRoleRequest();
        assumeRoleRequest.setRoleArn(this.ramRoleArn);
        assumeRoleRequest.setRoleSessionName("");
        assumeRoleRequest.setDurationSeconds(3600L);
        AssumeRoleResponse response = this.rawClient.getAcsResponse(assumeRoleRequest);

        Credentials credentials = response.getCredentials();
        String newKeyId = credentials.getAccessKeyId();
        String newSecret = credentials.getAccessKeySecret();
        String newStsToken = credentials.getSecurityToken();
        DefaultProfile roleProfile = DefaultProfile.getProfile(regionId, newKeyId, newSecret, newStsToken);
        this.tokenExpireTime = System.currentTimeMillis() + 3600 * 1000 - 60 * 100; //TODO: readExpireTime;
        this.roleClient = new DefaultAcsClient(roleProfile);
        return this.roleClient;
    }

    /**
     * 带有自动重试的的阿里云OpenAPI调用。
     * 如果请求入参不合法，服务端返回状态码为 4xx 时，会立即返回异常不再重试。
     *
     * @param request - OpenAPI 请求值
     * @return - OpenAPI响应值，不可能为空
     * @throws - ClientException: 请求异常或服务端异常
     */
    public <T extends AcsResponse> T sendRequest(AcsRequest<T> request) throws ClientException {
        String action = request.getSysActionName();
        for (int i = 0; ; i++) {
            try {
                return this.getAcsClient().getAcsResponse(request);
            } catch (ClientException e) {
                if (e.getErrorType() == ErrorType.Client) {
                    logger.error("{} invalid, requestId: {}, error: {}, {}",
                            action, e.getRequestId(), e.getErrCode(), e.getErrMsg());
                    throw e;
                }
                if (i >= this.maxRetry - 1) {
                    logger.warn("{} failed, requestId: {}, error: {}, {}",
                            action, e.getRequestId(), e.getErrCode(), e.getErrMsg());
                    throw e;
                }
            }
        }
    }

}