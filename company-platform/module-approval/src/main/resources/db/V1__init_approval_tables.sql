-- ============================================================
-- module-approval DDL Script for MariaDB
-- 테이블 Prefix: MOD_APPROVAL_
-- 실행 전 DB 생성 필요: CREATE DATABASE company_platform;
-- ============================================================

-- DB 생성 (존재하지 않을 경우)
CREATE DATABASE IF NOT EXISTS company_platform
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE company_platform;

-- ============================================================
-- 1. 결재 문서 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS MOD_APPROVAL_DOCUMENT (
    DOCUMENT_ID   BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '문서 ID (PK)',
    TITLE         VARCHAR(200)    NOT NULL                 COMMENT '문서 제목',
    CONTENT       TEXT            NULL                     COMMENT '문서 내용',
    REQUESTER_ID  VARCHAR(50)     NOT NULL                 COMMENT '요청자 ID',
    APPROVER_ID   VARCHAR(50)     NULL                     COMMENT '결재자 ID',
    STATUS        VARCHAR(20)     NOT NULL DEFAULT 'DRAFT' COMMENT '상태 (DRAFT/PENDING/APPROVED/REJECTED)',
    REJECT_REASON VARCHAR(500)    NULL                     COMMENT '반려 사유',
    CREATED_AT    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '생성 일시',
    UPDATED_AT    DATETIME        NULL     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',

    PRIMARY KEY (DOCUMENT_ID),
    INDEX IDX_MOD_APPROVAL_DOC_REQUESTER (REQUESTER_ID),
    INDEX IDX_MOD_APPROVAL_DOC_APPROVER_STATUS (APPROVER_ID, STATUS),
    INDEX IDX_MOD_APPROVAL_DOC_STATUS (STATUS),
    INDEX IDX_MOD_APPROVAL_DOC_CREATED (CREATED_AT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재 문서';

-- ============================================================
-- 2. 결재 이력 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS MOD_APPROVAL_HISTORY (
    HISTORY_ID    BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '이력 ID (PK)',
    DOCUMENT_ID   BIGINT          NOT NULL                 COMMENT '문서 ID (FK)',
    ACTOR_ID      VARCHAR(50)     NOT NULL                 COMMENT '처리자 ID',
    ACTION        VARCHAR(20)     NOT NULL                 COMMENT '액션 (CREATED/SUBMITTED/APPROVED/REJECTED)',
    COMMENT       VARCHAR(500)    NULL                     COMMENT '코멘트',
    CREATED_AT    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP  COMMENT '생성 일시',

    PRIMARY KEY (HISTORY_ID),
    INDEX IDX_MOD_APPROVAL_HIST_DOC (DOCUMENT_ID),
    INDEX IDX_MOD_APPROVAL_HIST_ACTOR (ACTOR_ID),

    CONSTRAINT FK_MOD_APPROVAL_HIST_DOC
        FOREIGN KEY (DOCUMENT_ID) REFERENCES MOD_APPROVAL_DOCUMENT (DOCUMENT_ID)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재 이력';
