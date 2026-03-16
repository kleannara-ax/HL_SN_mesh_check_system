package com.company.module.approval.entity;

/**
 * 결재 상태
 */
public enum ApprovalStatus {

    /** 초안 - 아직 결재 요청 전 */
    DRAFT,

    /** 대기 - 결재자에게 요청된 상태 */
    PENDING,

    /** 승인 완료 */
    APPROVED,

    /** 반려 */
    REJECTED
}
