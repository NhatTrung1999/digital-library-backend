import { IsOptional } from 'class-validator';

export class CreateLastLibraryDto {
  @IsOptional()
  Season_M?: string;
  @IsOptional()
  Creation_Workflow_M?: string;
  @IsOptional()
  Model_Number_M?: string;
  @IsOptional()
  Article_Number_A?: string;
  @IsOptional()
  Model_Name_Short_M?: string;
  @IsOptional()
  Sports_Category_M?: string;
  @IsOptional()
  Development_Type_A?: string;
  @IsOptional()
  Group_Name_A?: string;
  @IsOptional()
  Development_Factory_M?: string;
  @IsOptional()
  Digital_Scope_A?: string;
  @IsOptional()
  Digital_Scope_Update_Date_A?: string;
  @IsOptional()
  Marketing_Department_A?: string;
  @IsOptional()
  Preview_Final_Rendering_available_Downstream_Date_A?: string;
  @IsOptional()
  Presell_Final_Rendering_available_Downstream_Date_A?: string;
  @IsOptional()
  SMS_Final_Rendering_available_Downstream_Date_A?: string;
  @IsOptional()
  MCS_Final_rendering_available_Downstream_Date_A?: string;
  @IsOptional()
  Article_Status_A?: string;
  @IsOptional()
  Carry_Over_Season_A?: string;
  @IsOptional()
  Consumer_Testing_A?: string;
  @IsOptional()
  Image_Launch_Date_A?: string;
  @IsOptional()
  Developer_A?: string;
  @IsOptional()
  Senior_Developer_A?: string;
  @IsOptional()
  Drop_Date_A?: string;
  @IsOptional()
  Factory_3D_A?: string;
  @IsOptional()
  Tags_A?: string;
  @IsOptional()
  Preview_Approval_Publish_Date_A?: string;
  @IsOptional()
  Presell_Approval_Publish_Date_A?: string;
  @IsOptional()
  SMS_Approval_Publish_Date_A?: string;
  @IsOptional()
  MCS_Approval_Publish_Date_A?: string;
  @IsOptional()
  Published_by_A?: string;
  @IsOptional()
  Published_Milestone_Timestamp_A?: string;
  @IsOptional()
  Published_Milestone_A?: string;
  @IsOptional()
  Expected_Milestone_A?: string;
  @IsOptional()
  HQ_Render_Status_Timestamp_A?: string;
  @IsOptional()
  HQ_Render_Status_A?: string;
  @IsOptional()
  Design_Sketch_Latest_Update_A?: string;
  @IsOptional()
  Feasibility_Checked_Date_A?: string;
  @IsOptional()
  Image_Confidential_A?: string;
  @IsOptional()
  Last_M?: string;
}
