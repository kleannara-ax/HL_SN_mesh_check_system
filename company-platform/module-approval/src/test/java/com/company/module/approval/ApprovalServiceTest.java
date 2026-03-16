package com.company.module.approval;

import com.company.module.approval.dto.*;
import com.company.module.approval.entity.ApprovalDocument;
import com.company.module.approval.entity.ApprovalStatus;
import com.company.module.approval.repository.ApprovalDocumentRepository;
import com.company.module.approval.repository.ApprovalHistoryRepository;
import com.company.module.approval.service.ApprovalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApprovalService 단위 테스트")
class ApprovalServiceTest {

    @InjectMocks
    private ApprovalService approvalService;

    @Mock
    private ApprovalDocumentRepository documentRepository;

    @Mock
    private ApprovalHistoryRepository historyRepository;

    @Nested
    @DisplayName("문서 생성")
    class CreateDocument {

        @Test
        @DisplayName("정상적으로 결재 문서를 생성한다")
        void success() {
            // given
            ApprovalCreateRequest request = new ApprovalCreateRequest();
            request.setTitle("휴가 신청서");
            request.setContent("2026-04-01 ~ 2026-04-03 연차 사용");
            request.setRequesterId("user001");

            ApprovalDocument savedDoc = ApprovalDocument.builder()
                    .title(request.getTitle())
                    .content(request.getContent())
                    .requesterId(request.getRequesterId())
                    .status(ApprovalStatus.DRAFT)
                    .build();

            given(documentRepository.save(any(ApprovalDocument.class))).willReturn(savedDoc);
            given(historyRepository.save(any())).willReturn(null);

            // when
            ApprovalDocumentResponse response = approvalService.createDocument(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.getTitle()).isEqualTo("휴가 신청서");
            assertThat(response.getRequesterId()).isEqualTo("user001");
            assertThat(response.getStatus()).isEqualTo(ApprovalStatus.DRAFT);

            verify(documentRepository).save(any(ApprovalDocument.class));
            verify(historyRepository).save(any());
        }
    }

    @Nested
    @DisplayName("결재 요청")
    class SubmitDocument {

        @Test
        @DisplayName("DRAFT 상태의 문서를 PENDING으로 변경한다")
        void success() {
            // given
            Long documentId = 1L;
            ApprovalDocument document = ApprovalDocument.builder()
                    .title("출장 보고서")
                    .content("출장 내역")
                    .requesterId("user001")
                    .status(ApprovalStatus.DRAFT)
                    .build();

            given(documentRepository.findById(documentId)).willReturn(Optional.of(document));
            given(historyRepository.save(any())).willReturn(null);

            ApprovalSubmitRequest request = new ApprovalSubmitRequest();
            request.setApproverId("manager001");

            // when
            ApprovalDocumentResponse response = approvalService.submitDocument(documentId, request);

            // then
            assertThat(response.getStatus()).isEqualTo(ApprovalStatus.PENDING);
            assertThat(response.getApproverId()).isEqualTo("manager001");
        }
    }

    @Nested
    @DisplayName("결재 승인")
    class ApproveDocument {

        @Test
        @DisplayName("PENDING 상태의 문서를 APPROVED로 변경한다")
        void success() {
            // given
            Long documentId = 1L;
            ApprovalDocument document = ApprovalDocument.builder()
                    .title("구매 요청서")
                    .content("노트북 구매")
                    .requesterId("user001")
                    .approverId("manager001")
                    .status(ApprovalStatus.DRAFT)
                    .build();
            // DRAFT -> PENDING 으로 전환
            document.submitForApproval("manager001");

            given(documentRepository.findById(documentId)).willReturn(Optional.of(document));
            given(historyRepository.save(any())).willReturn(null);

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setActorId("manager001");
            request.setComment("승인합니다.");

            // when
            ApprovalDocumentResponse response = approvalService.approveDocument(documentId, request);

            // then
            assertThat(response.getStatus()).isEqualTo(ApprovalStatus.APPROVED);
        }
    }

    @Nested
    @DisplayName("결재 반려")
    class RejectDocument {

        @Test
        @DisplayName("PENDING 상태의 문서를 REJECTED로 변경한다")
        void success() {
            // given
            Long documentId = 1L;
            ApprovalDocument document = ApprovalDocument.builder()
                    .title("경비 청구서")
                    .content("식대 청구")
                    .requesterId("user002")
                    .approverId("manager001")
                    .status(ApprovalStatus.DRAFT)
                    .build();
            document.submitForApproval("manager001");

            given(documentRepository.findById(documentId)).willReturn(Optional.of(document));
            given(historyRepository.save(any())).willReturn(null);

            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setActorId("manager001");
            request.setComment("영수증 첨부가 누락되었습니다.");

            // when
            ApprovalDocumentResponse response = approvalService.rejectDocument(documentId, request);

            // then
            assertThat(response.getStatus()).isEqualTo(ApprovalStatus.REJECTED);
            assertThat(response.getRejectReason()).isEqualTo("영수증 첨부가 누락되었습니다.");
        }

        @Test
        @DisplayName("반려 사유 없이 반려하면 예외가 발생한다")
        void failWithoutReason() {
            // given
            Long documentId = 1L;
            ApprovalActionRequest request = new ApprovalActionRequest();
            request.setActorId("manager001");
            request.setComment(""); // 빈 사유

            // when & then
            assertThatThrownBy(() -> approvalService.rejectDocument(documentId, request))
                    .isInstanceOf(com.company.exception.BusinessException.class);
        }
    }
}
