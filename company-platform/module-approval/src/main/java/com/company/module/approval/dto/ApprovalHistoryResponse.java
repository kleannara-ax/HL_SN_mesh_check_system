package com.company.module.approval.dto;

import com.company.module.approval.entity.ApprovalHistory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 결재 이력 응답 DTO
 */
@Getter
@Builder
public class ApprovalHistoryResponse {

    private Long historyId;
    private Long documentId;
    private String actorId;
    private String action;
    private String comment;
    private LocalDateTime createdAt;

    public static ApprovalHistoryResponse from(ApprovalHistory entity) {
        return ApprovalHistoryResponse.builder()
                .historyId(entity.getHistoryId())
                .documentId(entity.getDocumentId())
                .actorId(entity.getActorId())
                .action(entity.getAction().name())
                .comment(entity.getComment())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
