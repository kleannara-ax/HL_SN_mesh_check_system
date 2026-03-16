package com.company.module.approval.dto;

import com.company.module.approval.entity.ApprovalDocument;
import com.company.module.approval.entity.ApprovalStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 결재 문서 응답 DTO
 */
@Getter
@Builder
public class ApprovalDocumentResponse {

    private Long documentId;
    private String title;
    private String content;
    private String requesterId;
    private String approverId;
    private ApprovalStatus status;
    private String rejectReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Entity -> Response DTO 변환
     */
    public static ApprovalDocumentResponse from(ApprovalDocument entity) {
        return ApprovalDocumentResponse.builder()
                .documentId(entity.getDocumentId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .requesterId(entity.getRequesterId())
                .approverId(entity.getApproverId())
                .status(entity.getStatus())
                .rejectReason(entity.getRejectReason())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
