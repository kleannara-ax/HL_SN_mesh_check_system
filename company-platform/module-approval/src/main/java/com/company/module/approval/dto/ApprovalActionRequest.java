package com.company.module.approval.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 결재 처리 (승인/반려) 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class ApprovalActionRequest {

    @NotBlank(message = "처리자 ID는 필수 입력 항목입니다.")
    @Size(max = 50, message = "처리자 ID는 50자를 초과할 수 없습니다.")
    private String actorId;

    @Size(max = 500, message = "사유는 500자를 초과할 수 없습니다.")
    private String comment;
}
