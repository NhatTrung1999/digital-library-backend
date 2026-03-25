import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UserPermissionsService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  // async findAll(userId: string) {
  //   try {
  //     return await this.db.query(
  //       `SELECT
  //          up.PermissionID,
  //          up.Level,
  //          up.MenuID,
  //          up.ModuleID,
  //          m.Name_EN  AS MenuName,
  //          mo.Name_EN AS ModuleName
  //        FROM UserPermissions up
  //        JOIN Menu m    ON m.MenuID    = up.MenuID
  //        JOIN Module mo ON mo.ModuleID = up.ModuleID
  //        WHERE up.UserID = :userId`,
  //       {
  //         replacements: { userId },
  //         type: QueryTypes.SELECT,
  //       },
  //     );
  //   } catch (error) {
  //     throw new InternalServerErrorException(
  //       `Lấy danh sách quyền thất bại: ${error.message}`,
  //     );
  //   }
  // }

  async findAll(userId: string, moduleID: string) {
    const transaction = await this.db.transaction();
    try {
      // await this.db.query(
      //   `IF OBJECT_ID(N'Tempdb..#temp') IS NOT NULL
      //         DROP TABLE #temp

      //     SELECT dm.MenuID
      //           ,dm.ModuleID
      //           ,:userId      AS UserID
      //           ,dm2.Name_EN  AS Module
      //           ,dm.Name_EN   AS Menu
      //           ,dul.Level
      //           ,dul.PermissionID
      //     INTO   #temp
      //     FROM   Menu AS dm
      //           LEFT JOIN (
      //                     SELECT *
      //                     FROM   Module
      //                     WHERE  STATUS            = 1
      //                           AND IsDeleted     = 0
      //                 ) AS dm2
      //                 ON  dm2.ModuleID = dm.ModuleID
      //           LEFT JOIN (
      //                     SELECT *
      //                     FROM   UserPermissions
      //                     WHERE  UserID = :userId
      //                 ) AS dul
      //                 ON  dul.ModuleID = dm2.ModuleID
      //                     AND dul.MenuID = dm.MenuID
      //     WHERE  dm2.ModuleID = :moduleID
      //           AND dm.Status = 1
      //           AND dm.IsDeleted = 0`,
      //   {
      //     replacements: { userId, moduleID },
      //     type: QueryTypes.RAW,
      //     transaction,
      //   },
      // );

      const result = await this.db.query(
        `IF OBJECT_ID(N'Tempdb..#temp') IS NOT NULL
              DROP TABLE #temp

          SELECT dm.MenuID
                ,dm.ModuleID
                ,:userId      AS UserID
                ,dm2.Name_EN  AS Module
                ,dm.Name_EN   AS Menu
                ,dul.Level
                ,dul.PermissionID
          INTO   #temp
          FROM   Menu AS dm
                LEFT JOIN (
                          SELECT *
                          FROM   Module
                          WHERE  STATUS            = 1
                                AND IsDeleted     = 0
                      ) AS dm2
                      ON  dm2.ModuleID = dm.ModuleID
                LEFT JOIN (
                          SELECT *
                          FROM   UserPermissions
                          WHERE  UserID = :userId
                      ) AS dul
                      ON  dul.ModuleID = dm2.ModuleID
                          AND dul.MenuID = dm.MenuID
          WHERE  dm2.ModuleID = :moduleID
                AND dm.Status = 1
                AND dm.IsDeleted = 0

        SELECT tmp.MenuID
              ,tmp.ModuleID
              ,tmp.Module
              ,tmp.Menu
              ,tmp.Level        AS LevelPermission
              ,tmp.PermissionID
              ,u.UserID         AS UserID
              ,u.Username
        FROM   #temp            AS tmp
              LEFT JOIN Users  AS u
                    ON  u.UserID = tmp.UserID`,
        {
          replacements: { userId, moduleID },
          type: QueryTypes.SELECT,
          transaction,
        },
      );

      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw new InternalServerErrorException(
        `Lấy danh sách quyền thất bại: ${error.message}`,
      );
    }
  }

  async savePermission(
    dto: { userId: string; menuId: string; moduleId: string; level: number },
    createdBy: string,
  ) {
    try {
      const [existing]: any = await this.db.query(
        `SELECT PermissionID
         FROM UserPermissions
         WHERE UserID   = :userId
           AND MenuID   = :menuId
           AND ModuleID = :moduleId`,
        {
          replacements: {
            userId: dto.userId,
            menuId: dto.menuId,
            moduleId: dto.moduleId,
          },
          type: QueryTypes.SELECT,
        },
      );

      if (existing) {
        await this.db.query(
          `UPDATE UserPermissions
           SET Level     = :level,
               UpdatedAt = GETDATE(),
               UpdatedBy = :updatedBy
           WHERE UserID   = :userId
             AND MenuID   = :menuId
             AND ModuleID = :moduleId`,
          {
            replacements: {
              userId: dto.userId,
              menuId: dto.menuId,
              moduleId: dto.moduleId,
              level: dto.level,
              updatedBy: createdBy,
            },
            type: QueryTypes.UPDATE,
          },
        );
      } else {
        await this.db.query(
          `INSERT INTO UserPermissions
             (PermissionID, UserID, ModuleID, MenuID, Level, CreatedBy)
           VALUES
             (NEWID(), :userId, :moduleId, :menuId, :level, :createdBy)`,
          {
            replacements: {
              userId: dto.userId,
              menuId: dto.menuId,
              moduleId: dto.moduleId,
              level: dto.level,
              createdBy: createdBy,
            },
            type: QueryTypes.INSERT,
          },
        );
      }

      const data = await this.db.query(
        `SELECT
           up.*,
           m.Name_EN  AS MenuName,
           mo.Name_EN AS ModuleName
         FROM UserPermissions up
         JOIN Menu m    ON m.MenuID    = up.MenuID
         JOIN Module mo ON mo.ModuleID = up.ModuleID
         WHERE up.UserID   = :userId
           AND up.MenuID   = :menuId
           AND up.ModuleID = :moduleId`,
        {
          replacements: {
            userId: dto.userId,
            menuId: dto.menuId,
            moduleId: dto.moduleId,
          },
          type: QueryTypes.SELECT,
        },
      );

      return {
        message: existing
          ? 'Cập nhật quyền thành công'
          : 'Tạo quyền thành công',
        data: data[0],
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Lưu quyền thất bại: ${error.message}`,
      );
    }
  }
}
