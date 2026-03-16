package com.company.module.approval.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 결재 문서 생성 요청 DTO
 */
@Getter
@Setter
@NoArgsConstructor
public class ApprovalCreateRequest {

    @NotBlank(message = "제목은 필수 입력 항목입니다.")
    @Size(max = 200, message = "제목은 200자를 초과할 수 없습니다.")
    private String title;

    private String content;

    @NotBlank(message = "요청자 ID는 필수 입력 항목입니다.")
    @Size(max = 50, message = "요청자 ID는 50자를 초과할 수 없습니다.")
    private String requesterId;
}
