package com.aliyun.cloudops.acs;

import javax.servlet.http.HttpServletRequest;

import com.aliyuncs.exceptions.ClientException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;

public abstract class AcsController {

    @Autowired
    protected AcsClient acsClient;

    protected final Logger logger = LoggerFactory.getLogger(this.getClass());

    @ExceptionHandler(ClientException.class)
    public ResponseEntity<OpenApiError> handleAcsClientException(HttpServletRequest request, ClientException ce) {
        logger.error("process request: {}, open-api error, requestId: {}, error-code: {}, error-msg: {}",
                request.getRequestURI(), ce.getRequestId(), ce.getErrCode(), ce.getErrMsg()
        );
        return new ResponseEntity<>(new OpenApiError(ce), HttpStatus.BAD_GATEWAY);
    }

    public static class OpenApiError {

        private final String requestId;
        private final String errorCode;
        private final String errorInfo;

        public OpenApiError(ClientException ce) {
            this.requestId = ce.getRequestId();
            this.errorCode = ce.getErrCode();
            this.errorInfo = ce.getErrMsg();
        }

        public String getRequestId() {
            return requestId;
        }

        public String getErrorCode() {
            return errorCode;
        }

        public String getErrorInfo() {
            return errorInfo;
        }
    }
}
