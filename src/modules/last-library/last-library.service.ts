import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { CreateLastLibraryDto } from './dto/create-last-library.dto';
import { UpdateLastLibraryDto } from './dto/update-last-library.dto';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class LastLibraryService {
  constructor(
    @Inject('LYG_DL') private readonly db: Sequelize,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: any) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;

      const sort = query.sort || 'CreatedAt';
      const order = query.order === 'ASC' ? 'ASC' : 'DESC';

      const fieldMap: Record<string, string> = {
        seasonM: 'Season_M',
        creationWorkflowM: 'Creation_Workflow_M',
        modelNumberM: 'Model_Number_M',
        articleNumberA: 'Article_Number_A',
        modelNameShortM: 'Model_Name_Short_M',
        sportsCategoryM: 'Sports_Category_M',
        developmentTypeA: 'Development_Type_A',
        groupNameA: 'Group_Name_A',
        developmentFactoryM: 'Development_Factory_M',
        digitalScopeA: 'Digital_Scope_A',
        digitalScopeUpdateDateA: 'Digital_Scope_Update_Date_A',
        marketingDepartmentA: 'Marketing_Department_A',
        previewFinalRenderingAvailableDownstreamDateA:
          'Preview_Final_Rendering_available_Downstream_Date_A',
        presellFinalRenderingAvailableDownstreamDateA:
          'Presell_Final_Rendering_available_Downstream_Date_A',
        smsFinalRenderingAvailableDownstreamDateA:
          'SMS_Final_Rendering_available_Downstream_Date_A',
        mcsFinalRenderingAvailableDownstreamDateA:
          'MCS_Final_rendering_available_Downstream_Date_A',
        articleStatusA: 'Article_Status_A',
        carryOverSeasonA: 'Carry_Over_Season_A',
        consumerTestingA: 'Consumer_Testing_A',
        imageLaunchDateA: 'Image_Launch_Date_A',
        developerA: 'Developer_A',
        seniorDeveloperA: 'Senior_Developer_A',
        dropDateA: 'Drop_Date_A',
        factory3dA: 'Factory_3D_A',
        tagsA: 'Tags_A',
        previewApprovalPublishDateA: 'Preview_Approval_Publish_Date_A',
        presellApprovalPublishDateA: 'Presell_Approval_Publish_Date_A',
        smsApprovalPublishDateA: 'SMS_Approval_Publish_Date_A',
        mcsApprovalPublishDateA: 'MCS_Approval_Publish_Date_A',
        publishedByA: 'Published_by_A',
        publishedMilestoneTimestampA: 'Published_Milestone_Timestamp_A',
        publishedMilestoneA: 'Published_Milestone_A',
        expectedMilestoneA: 'Expected_Milestone_A',
        hqRenderStatusTimestampA: 'HQ_Render_Status_Timestamp_A',
        hqRenderStatusA: 'HQ_Render_Status_A',
        designSketchLatestUpdateA: 'Design_Sketch_Latest_Update_A',
        feasibilityCheckedDateA: 'Feasibility_Checked_Date_A',
        imageConfidentialA: 'Image_Confidential_A',
        lastM: 'Last_M',
      };

      const conditions: string[] = ['IsDeleted = 0'];
      const replacements: Record<string, any> = {};

      for (const [queryKey, dbField] of Object.entries(fieldMap)) {
        const value = query[queryKey];
        if (value !== undefined && value !== null && value !== '') {
          conditions.push(`${dbField} LIKE :${queryKey}`);
          replacements[queryKey] = `%${value}%`;
        }
      }

      const whereSql = conditions.join(' AND ');

      // Đếm tổng
      const [[countResult]]: any = await this.db.query(
        `SELECT COUNT(*) AS total FROM LastLibrary WHERE ${whereSql}`,
        { replacements },
      );

      const total = countResult.total;

      // Lấy data có phân trang
      const data = await this.db.query(
        `SELECT *
         FROM LastLibrary
         WHERE ${whereSql}
         ORDER BY ${sort} ${order}
         OFFSET :offset ROWS
         FETCH NEXT :limit ROWS ONLY`,
        {
          replacements: { ...replacements, offset, limit },
          type: QueryTypes.SELECT,
        },
      );

      return {
        data,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Lấy danh sách LastLibrary thất bại: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      const result = await this.db.query(
        `SELECT * FROM LastLibrary WHERE LastLibraryID = :id AND IsDeleted = 0`,
        {
          replacements: { id },
          type: QueryTypes.SELECT,
        },
      );

      if (!result.length) {
        throw new NotFoundException(`LastLibrary với ID "${id}" không tồn tại`);
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Lấy LastLibrary thất bại: ${error.message}`,
      );
    }
  }

  async create(dto: CreateLastLibraryDto, userId: string) {
    try {
      await this.db.query(
        `INSERT INTO LastLibrary (
          Season_M, Creation_Workflow_M, Model_Number_M, Article_Number_A,
          Model_Name_Short_M, Sports_Category_M, Development_Type_A, Group_Name_A,
          Development_Factory_M, Digital_Scope_A, Digital_Scope_Update_Date_A,
          Marketing_Department_A, Preview_Final_Rendering_available_Downstream_Date_A,
          Presell_Final_Rendering_available_Downstream_Date_A,
          SMS_Final_Rendering_available_Downstream_Date_A,
          MCS_Final_rendering_available_Downstream_Date_A,
          Article_Status_A, Carry_Over_Season_A, Consumer_Testing_A,
          Image_Launch_Date_A, Developer_A, Senior_Developer_A, Drop_Date_A,
          Factory_3D_A, Tags_A, Preview_Approval_Publish_Date_A,
          Presell_Approval_Publish_Date_A, SMS_Approval_Publish_Date_A,
          MCS_Approval_Publish_Date_A, Published_by_A,
          Published_Milestone_Timestamp_A, Published_Milestone_A,
          Expected_Milestone_A, HQ_Render_Status_Timestamp_A, HQ_Render_Status_A,
          Design_Sketch_Latest_Update_A, Feasibility_Checked_Date_A,
          Image_Confidential_A, Last_M, CreatedAt, CreatedBy
        ) VALUES (
          :Season_M, :Creation_Workflow_M, :Model_Number_M, :Article_Number_A,
          :Model_Name_Short_M, :Sports_Category_M, :Development_Type_A, :Group_Name_A,
          :Development_Factory_M, :Digital_Scope_A, :Digital_Scope_Update_Date_A,
          :Marketing_Department_A, :Preview_Final_Rendering_available_Downstream_Date_A,
          :Presell_Final_Rendering_available_Downstream_Date_A,
          :SMS_Final_Rendering_available_Downstream_Date_A,
          :MCS_Final_rendering_available_Downstream_Date_A,
          :Article_Status_A, :Carry_Over_Season_A, :Consumer_Testing_A,
          :Image_Launch_Date_A, :Developer_A, :Senior_Developer_A, :Drop_Date_A,
          :Factory_3D_A, :Tags_A, :Preview_Approval_Publish_Date_A,
          :Presell_Approval_Publish_Date_A, :SMS_Approval_Publish_Date_A,
          :MCS_Approval_Publish_Date_A, :Published_by_A,
          :Published_Milestone_Timestamp_A, :Published_Milestone_A,
          :Expected_Milestone_A, :HQ_Render_Status_Timestamp_A, :HQ_Render_Status_A,
          :Design_Sketch_Latest_Update_A, :Feasibility_Checked_Date_A,
          :Image_Confidential_A, :Last_M, GETDATE(), :CreatedBy
        )`,
        {
          replacements: {
            Season_M: dto.Season_M ?? null,
            Creation_Workflow_M: dto.Creation_Workflow_M ?? null,
            Model_Number_M: dto.Model_Number_M ?? null,
            Article_Number_A: dto.Article_Number_A ?? null,
            Model_Name_Short_M: dto.Model_Name_Short_M ?? null,
            Sports_Category_M: dto.Sports_Category_M ?? null,
            Development_Type_A: dto.Development_Type_A ?? null,
            Group_Name_A: dto.Group_Name_A ?? null,
            Development_Factory_M: dto.Development_Factory_M ?? null,
            Digital_Scope_A: dto.Digital_Scope_A ?? null,
            Digital_Scope_Update_Date_A:
              dto.Digital_Scope_Update_Date_A ?? null,
            Marketing_Department_A: dto.Marketing_Department_A ?? null,
            Preview_Final_Rendering_available_Downstream_Date_A:
              dto.Preview_Final_Rendering_available_Downstream_Date_A ?? null,
            Presell_Final_Rendering_available_Downstream_Date_A:
              dto.Presell_Final_Rendering_available_Downstream_Date_A ?? null,
            SMS_Final_Rendering_available_Downstream_Date_A:
              dto.SMS_Final_Rendering_available_Downstream_Date_A ?? null,
            MCS_Final_rendering_available_Downstream_Date_A:
              dto.MCS_Final_rendering_available_Downstream_Date_A ?? null,
            Article_Status_A: dto.Article_Status_A ?? null,
            Carry_Over_Season_A: dto.Carry_Over_Season_A ?? null,
            Consumer_Testing_A: dto.Consumer_Testing_A ?? null,
            Image_Launch_Date_A: dto.Image_Launch_Date_A ?? null,
            Developer_A: dto.Developer_A ?? null,
            Senior_Developer_A: dto.Senior_Developer_A ?? null,
            Drop_Date_A: dto.Drop_Date_A ?? null,
            Factory_3D_A: dto.Factory_3D_A ?? null,
            Tags_A: dto.Tags_A ?? null,
            Preview_Approval_Publish_Date_A:
              dto.Preview_Approval_Publish_Date_A ?? null,
            Presell_Approval_Publish_Date_A:
              dto.Presell_Approval_Publish_Date_A ?? null,
            SMS_Approval_Publish_Date_A:
              dto.SMS_Approval_Publish_Date_A ?? null,
            MCS_Approval_Publish_Date_A:
              dto.MCS_Approval_Publish_Date_A ?? null,
            Published_by_A: dto.Published_by_A ?? null,
            Published_Milestone_Timestamp_A:
              dto.Published_Milestone_Timestamp_A ?? null,
            Published_Milestone_A: dto.Published_Milestone_A ?? null,
            Expected_Milestone_A: dto.Expected_Milestone_A ?? null,
            HQ_Render_Status_Timestamp_A:
              dto.HQ_Render_Status_Timestamp_A ?? null,
            HQ_Render_Status_A: dto.HQ_Render_Status_A ?? null,
            Design_Sketch_Latest_Update_A:
              dto.Design_Sketch_Latest_Update_A ?? null,
            Feasibility_Checked_Date_A: dto.Feasibility_Checked_Date_A ?? null,
            Image_Confidential_A: dto.Image_Confidential_A ?? null,
            Last_M: dto.Last_M ?? null,
            CreatedBy: userId ?? null,
          },
          type: QueryTypes.INSERT,
        },
      );

      // Trả về record vừa tạo
      const created = await this.db.query(
        `SELECT *
         FROM LastLibrary
         WHERE CreatedBy = :userId
           AND IsDeleted = 0
           AND Article_Number_A = :Article_Number_A
         ORDER BY CreatedAt DESC
         OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`,
        {
          replacements: { userId, Article_Number_A: dto.Article_Number_A },
          type: QueryTypes.SELECT,
        },
      );

      return created[0];
    } catch (error) {
      throw new InternalServerErrorException(
        `Tạo LastLibrary thất bại: ${error.message}`,
      );
    }
  }

  async update(id: string, dto: UpdateLastLibraryDto, userId: string) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE LastLibrary SET
          Season_M = :Season_M,
          Creation_Workflow_M = :Creation_Workflow_M,
          Model_Number_M = :Model_Number_M,
          Article_Number_A = :Article_Number_A,
          Model_Name_Short_M = :Model_Name_Short_M,
          Sports_Category_M = :Sports_Category_M,
          Development_Type_A = :Development_Type_A,
          Group_Name_A = :Group_Name_A,
          Development_Factory_M = :Development_Factory_M,
          Digital_Scope_A = :Digital_Scope_A,
          Digital_Scope_Update_Date_A = :Digital_Scope_Update_Date_A,
          Marketing_Department_A = :Marketing_Department_A,
          Preview_Final_Rendering_available_Downstream_Date_A = :Preview_Final_Rendering_available_Downstream_Date_A,
          Presell_Final_Rendering_available_Downstream_Date_A = :Presell_Final_Rendering_available_Downstream_Date_A,
          SMS_Final_Rendering_available_Downstream_Date_A = :SMS_Final_Rendering_available_Downstream_Date_A,
          MCS_Final_rendering_available_Downstream_Date_A = :MCS_Final_rendering_available_Downstream_Date_A,
          Article_Status_A = :Article_Status_A,
          Carry_Over_Season_A = :Carry_Over_Season_A,
          Consumer_Testing_A = :Consumer_Testing_A,
          Image_Launch_Date_A = :Image_Launch_Date_A,
          Developer_A = :Developer_A,
          Senior_Developer_A = :Senior_Developer_A,
          Drop_Date_A = :Drop_Date_A,
          Factory_3D_A = :Factory_3D_A,
          Tags_A = :Tags_A,
          Preview_Approval_Publish_Date_A = :Preview_Approval_Publish_Date_A,
          Presell_Approval_Publish_Date_A = :Presell_Approval_Publish_Date_A,
          SMS_Approval_Publish_Date_A = :SMS_Approval_Publish_Date_A,
          MCS_Approval_Publish_Date_A = :MCS_Approval_Publish_Date_A,
          Published_by_A = :Published_by_A,
          Published_Milestone_Timestamp_A = :Published_Milestone_Timestamp_A,
          Published_Milestone_A = :Published_Milestone_A,
          Expected_Milestone_A = :Expected_Milestone_A,
          HQ_Render_Status_Timestamp_A = :HQ_Render_Status_Timestamp_A,
          HQ_Render_Status_A = :HQ_Render_Status_A,
          Design_Sketch_Latest_Update_A = :Design_Sketch_Latest_Update_A,
          Feasibility_Checked_Date_A = :Feasibility_Checked_Date_A,
          Image_Confidential_A = :Image_Confidential_A,
          Last_M = :Last_M,
          UpdatedAt = GETDATE(),
          UpdatedBy = :UpdatedBy
        WHERE LastLibraryID = :id AND IsDeleted = 0`,
        {
          replacements: {
            id,
            Season_M: dto.Season_M ?? null,
            Creation_Workflow_M: dto.Creation_Workflow_M ?? null,
            Model_Number_M: dto.Model_Number_M ?? null,
            Article_Number_A: dto.Article_Number_A ?? null,
            Model_Name_Short_M: dto.Model_Name_Short_M ?? null,
            Sports_Category_M: dto.Sports_Category_M ?? null,
            Development_Type_A: dto.Development_Type_A ?? null,
            Group_Name_A: dto.Group_Name_A ?? null,
            Development_Factory_M: dto.Development_Factory_M ?? null,
            Digital_Scope_A: dto.Digital_Scope_A ?? null,
            Digital_Scope_Update_Date_A:
              dto.Digital_Scope_Update_Date_A ?? null,
            Marketing_Department_A: dto.Marketing_Department_A ?? null,
            Preview_Final_Rendering_available_Downstream_Date_A:
              dto.Preview_Final_Rendering_available_Downstream_Date_A ?? null,
            Presell_Final_Rendering_available_Downstream_Date_A:
              dto.Presell_Final_Rendering_available_Downstream_Date_A ?? null,
            SMS_Final_Rendering_available_Downstream_Date_A:
              dto.SMS_Final_Rendering_available_Downstream_Date_A ?? null,
            MCS_Final_rendering_available_Downstream_Date_A:
              dto.MCS_Final_rendering_available_Downstream_Date_A ?? null,
            Article_Status_A: dto.Article_Status_A ?? null,
            Carry_Over_Season_A: dto.Carry_Over_Season_A ?? null,
            Consumer_Testing_A: dto.Consumer_Testing_A ?? null,
            Image_Launch_Date_A: dto.Image_Launch_Date_A ?? null,
            Developer_A: dto.Developer_A ?? null,
            Senior_Developer_A: dto.Senior_Developer_A ?? null,
            Drop_Date_A: dto.Drop_Date_A ?? null,
            Factory_3D_A: dto.Factory_3D_A ?? null,
            Tags_A: dto.Tags_A ?? null,
            Preview_Approval_Publish_Date_A:
              dto.Preview_Approval_Publish_Date_A ?? null,
            Presell_Approval_Publish_Date_A:
              dto.Presell_Approval_Publish_Date_A ?? null,
            SMS_Approval_Publish_Date_A:
              dto.SMS_Approval_Publish_Date_A ?? null,
            MCS_Approval_Publish_Date_A:
              dto.MCS_Approval_Publish_Date_A ?? null,
            Published_by_A: dto.Published_by_A ?? null,
            Published_Milestone_Timestamp_A:
              dto.Published_Milestone_Timestamp_A ?? null,
            Published_Milestone_A: dto.Published_Milestone_A ?? null,
            Expected_Milestone_A: dto.Expected_Milestone_A ?? null,
            HQ_Render_Status_Timestamp_A:
              dto.HQ_Render_Status_Timestamp_A ?? null,
            HQ_Render_Status_A: dto.HQ_Render_Status_A ?? null,
            Design_Sketch_Latest_Update_A:
              dto.Design_Sketch_Latest_Update_A ?? null,
            Feasibility_Checked_Date_A: dto.Feasibility_Checked_Date_A ?? null,
            Image_Confidential_A: dto.Image_Confidential_A ?? null,
            Last_M: dto.Last_M ?? null,
            UpdatedBy: userId ?? null,
          },
          type: QueryTypes.UPDATE,
        },
      );

      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Cập nhật LastLibrary thất bại: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE LastLibrary
         SET IsDeleted = 1,
             DeletedAt = GETDATE(),
             DeletedBy = :deletedBy
         WHERE LastLibraryID = :id`,
        {
          replacements: { id, deletedBy: userId },
          type: QueryTypes.UPDATE,
        },
      );

      return {
        success: true,
        message: 'Deleted successfully!',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Xóa LastLibrary thất bại: ${error.message}`,
      );
    }
  }

  async add3DMFile(
    file: Express.Multer.File,
    lastLibraryId: string,
    userId: string,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('File is required');
      }

      const [existing]: any = await this.db.query(
        `SELECT LastLibrary3DMID, FilePath
         FROM LastLibrary3DM
         WHERE LastLibraryID = ?
           AND IsDeleted = 0`,
        { replacements: [lastLibraryId] },
      );

      if (existing.length > 0) {
        const oldFile = existing[0];

        if (oldFile.FilePath && fs.existsSync(path.resolve(oldFile.FilePath))) {
          fs.unlinkSync(path.resolve(oldFile.FilePath));
        }

        await this.db.query(
          `UPDATE LastLibrary3DM
           SET FileName  = ?,
               FilePath  = ?,
               FileType  = ?,
               FileSize  = ?,
               UpdatedBy = ?,
               UpdatedAt = GETDATE()
           WHERE LastLibraryID = ?
             AND IsDeleted = 0`,
          {
            replacements: [
              file.originalname || null,
              file.path || null,
              file.mimetype || null,
              file.size || null,
              userId || null,
              lastLibraryId,
            ],
          },
        );
      } else {
        await this.db.query(
          `INSERT INTO LastLibrary3DM
             (LastLibrary3DMID, LastLibraryID, FileName, FilePath, FileType, FileSize, CreatedBy)
           VALUES
             (NEWID(), ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              lastLibraryId,
              file.originalname || null,
              file.path || null,
              file.mimetype || null,
              file.size || null,
              userId || null,
            ],
          },
        );
      }

      const [rows]: any = await this.db.query(
        `SELECT ll.*, f.LastLibrary3DMID, f.FileName, f.FilePath, f.FileType, f.FileSize
         FROM LastLibrary ll
         LEFT JOIN LastLibrary3DM f
           ON f.LastLibraryID = ll.LastLibraryID
           AND f.IsDeleted = 0
         WHERE ll.LastLibraryID = ?
           AND ll.IsDeleted = 0`,
        { replacements: [lastLibraryId] },
      );

      const baseUrl = this.configService.get<string>('BASE_URL');
      const item = rows[0];

      const data = {
        ...item,
        FilePath: item.FilePath
          ? `${baseUrl}/${item.FilePath.replace(/\\/g, '/')}`
          : null,
      };

      return {
        message:
          existing.length > 0
            ? 'File updated successfully'
            : 'Upload file success',
        data,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        error?.message || 'Upload file 3DM failed',
      );
    }
  }
}
