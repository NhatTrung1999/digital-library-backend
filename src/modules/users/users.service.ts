import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class UsersService {
  constructor(@Inject('LYG_DL') private readonly db: Sequelize) {}

  async checkExist(username: string): Promise<boolean> {
    const [rows] = await this.db.query(
      `SELECT 1 FROM Users WHERE Username = :username AND IsDeleted = 0`,
      { replacements: { username } },
    );
    return (rows as any[]).length > 0;
  }

  async createUser(
    data: {
      username: string;
      passwordHash: string;
      email?: string;
      fullName?: string;
      vendorCode?: string;
      factory?: string;
    },
    userId: string,
    transaction: Transaction,
  ): Promise<string> {
    const [result] = await this.db.query(
      `INSERT INTO Users (VendorCode, Username, Email, Password, FullName, CreatedBy, Factory)
       OUTPUT INSERTED.UserID
       VALUES (:vendorCode, :username, :email, :passwordHash, :fullName, :createdBy, :factory)`,
      {
        replacements: {
          vendorCode: data.vendorCode ?? null,
          username: data.username,
          email: data.email ?? null,
          passwordHash: data.passwordHash,
          fullName: data.fullName ?? null,
          createdBy: userId,
          factory: data.factory ?? null,
        },
        transaction,
      },
    );
    return (result as any[])[0].UserID;
  }

  async assignRole(userId: string, roleCode: string, transaction: Transaction) {
    await this.db.query(
      `INSERT INTO UserRoles (UserID, RoleID)
       SELECT :userId, RoleID FROM Roles WHERE RoleCode = :roleCode`,
      { replacements: { userId, roleCode }, transaction },
    );
  }

  async findByUsername(username: string) {
    const [rows] = await this.db.query(
      `SELECT * FROM Users WHERE Username = :username`,
      { replacements: { username } },
    );

    const user = (rows as any[])[0];

    if (!user) return null;

    if (user.IsDeleted) {
      throw new BadRequestException('Tài khoản này không tồn tại!');
    }

    return user;
  }

  async getUserRoles(userId: string) {
    const [rows] = await this.db.query(
      `SELECT r.RoleCode, r.RoleLevel
       FROM UserRoles ur
       JOIN Roles r ON ur.RoleID = r.RoleID
       WHERE ur.UserID = :userId`,
      { replacements: { userId } },
    );
    return rows as { RoleCode: string; RoleLevel: number }[];
  }

  async findAll(query: any) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;

      const sort = query.sort || 'CreatedAt';
      const order = query.order === 'ASC' ? 'ASC' : 'DESC';

      const conditions: string[] = ['u.IsDeleted = 0'];
      const replacements: Record<string, any> = {};

      if (query.username) {
        conditions.push('u.Username LIKE :username');
        replacements.username = `%${query.username}%`;
      }
      if (query.email) {
        conditions.push('u.Email LIKE :email');
        replacements.email = `%${query.email}%`;
      }
      if (query.fullName) {
        conditions.push('u.FullName LIKE :fullName');
        replacements.fullName = `%${query.fullName}%`;
      }
      if (query.vendorCode) {
        conditions.push('u.VendorCode LIKE :vendorCode');
        replacements.vendorCode = `%${query.vendorCode}%`;
      }

      const whereSql = conditions.join(' AND ');

      const [[countResult]]: any = await this.db.query(
        `SELECT COUNT(*) AS total FROM Users u WHERE ${whereSql}`,
        { replacements },
      );

      const total = countResult.total;

      const data = await this.db.query(
        `SELECT
           u.UserID, u.Username, u.Email, u.Factory, u.FullName, u.PhoneNumber,
           u.AvatarUrl, u.VendorCode, u.IsActive, u.LastLoginAt,
           u.CreatedAt, u.CreatedBy, u.UpdatedAt, u.UpdatedBy,
           (
             SELECT r.RoleCode
             FROM UserRoles ur
             JOIN Roles r ON r.RoleID = ur.RoleID
             WHERE ur.UserID = u.UserID
           ) AS LevelPermission
         FROM Users u
         WHERE ${whereSql}
         ORDER BY u.${sort} ${order}
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
        `Lấy danh sách Users thất bại: ${error.message}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      const result = await this.db.query(
        `SELECT UserID, Username, Email, FullName, PhoneNumber,
                AvatarUrl, VendorCode, IsActive, LastLoginAt,
                CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
         FROM Users
         WHERE UserID = :id AND IsDeleted = 0`,
        { replacements: { id }, type: QueryTypes.SELECT },
      );

      if (!result.length) {
        throw new NotFoundException(`User với ID "${id}" không tồn tại`);
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Lấy User thất bại: ${error.message}`,
      );
    }
  }

  async update(
    id: string,
    dto: {
      Email?: string;
      FullName?: string;
      PhoneNumber?: string;
      AvatarUrl?: string;
      VendorCode?: string;
      LevelPermission?: string;
      IsActive?: number;
    },
    userId: string,
  ) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE Users
         SET Email       = :email,
             FullName    = :fullName,
             PhoneNumber = :phoneNumber,
             AvatarUrl   = :avatarUrl,
             VendorCode  = :vendorCode,
             IsActive    = :isActive,
             UpdatedAt   = GETDATE(),
             UpdatedBy   = :updatedBy
         WHERE UserID = :id AND IsDeleted = 0`,
        {
          replacements: {
            id,
            email: dto.Email ?? null,
            fullName: dto.FullName ?? null,
            phoneNumber: dto.PhoneNumber ?? null,
            avatarUrl: dto.AvatarUrl ?? null,
            vendorCode: dto.VendorCode ?? null,
            isActive: dto.IsActive ?? 1,
            updatedBy: userId ?? null,
          },
          type: QueryTypes.UPDATE,
        },
      );

      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Cập nhật User thất bại: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE Users
         SET IsDeleted = 1,
             DeletedAt = GETDATE(),
             DeletedBy = :deletedBy
         WHERE UserID = :id`,
        {
          replacements: { id, deletedBy: userId },
          type: QueryTypes.UPDATE,
        },
      );

      return {
        success: true,
        message: 'Deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Xóa User thất bại: ${error.message}`,
      );
    }
  }
}
