package com.company.exception;

import lombok.Getter;

/**
 * Core 공통 비즈니스 예외 (수정 금지)
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String errorCode;
    private final int status;

    public BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.status = 400;
    }

    public BusinessException(String errorCode, String message, int status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }
}
