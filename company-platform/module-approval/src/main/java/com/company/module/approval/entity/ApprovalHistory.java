package com.company.module.approval.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 결재 이력 엔티티
 * 테이블: MOD_APPROVAL_HISTORY
 */
@Entity
@Table(name = "MOD_APPROVAL_HISTORY")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "HISTORY_ID")
    private Long historyId;

    @Column(name = "DOCUMENT_ID", nullable = false)
    private Long documentId;

    @Column(name = "ACTOR_ID", nullable = false, length = 50)
    private String actorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ACTION", nullable = false, length = 20)
    private ApprovalAction action;

    @Column(name = "COMMENT", length = 500)
    private String comment;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    public ApprovalHistory(Long documentId, String actorId,
                           ApprovalAction action, String comment) {
        this.documentId = documentId;
        this.actorId = actorId;
        this.action = action;
        this.comment = comment;
    }

    /**
     * 결재 이력 액션 유형
     */
    public enum ApprovalAction {
        /** 문서 생성 */
        CREATED,
        /** 결재 요청 */
        SUBMITTED,
        /** 승인 */
        APPROVED,
        /** 반려 */
        REJECTED
    }
}
