import {
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

  async checkExist(username: string, email: string): Promise<boolean> {
    const [rows] = await this.db.query(
      `SELECT 1 FROM Users WHERE Username = :username OR Email = :email`,
      { replacements: { username, email } },
    );
    return (rows as any[]).length > 0;
  }

  async createUser(
    data: {
      username: string;
      email: string;
      passwordHash: string;
      fullName?: string;
      vendorCode?: string;
    },
    transaction: Transaction,
  ): Promise<string> {
    const [result] = await this.db.query(
      `INSERT INTO Users (VendorCode, Username, Email, Password, FullName)
       OUTPUT INSERTED.UserID
       VALUES (:vendorCode, :username, :email, :passwordHash, :fullName)`,
      {
        replacements: {
          vendorCode: data.vendorCode ?? null,
          username: data.username,
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName ?? null,
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
    return (rows as any[])[0];
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
      const conditions: string[] = ['IsDeleted = 0'];
      const replacements: Record<string, any> = {};

      if (query.username) {
        conditions.push('Username LIKE :username');
        replacements.username = `%${query.username}%`;
      }
      if (query.email) {
        conditions.push('Email LIKE :email');
        replacements.email = `%${query.email}%`;
      }
      if (query.fullName) {
        conditions.push('FullName LIKE :fullName');
        replacements.fullName = `%${query.fullName}%`;
      }
      if (query.vendorCode) {
        conditions.push('VendorCode LIKE :vendorCode');
        replacements.vendorCode = `%${query.vendorCode}%`;
      }

      return await this.db.query(
        `SELECT UserID, Username, Email, FullName, PhoneNumber,
                AvatarUrl, VendorCode, IsActive, LastLoginAt,
                CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
         FROM Users
         WHERE ${conditions.join(' AND ')}`,
        { replacements, type: QueryTypes.SELECT },
      );
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
      fullName?: string;
      phoneNumber?: string;
      avatarUrl?: string;
      vendorCode?: string;
      isActive?: number;
    },
    userId: string,
  ) {
    try {
      await this.findOne(id);

      await this.db.query(
        `UPDATE Users
         SET FullName    = :fullName,
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
            fullName: dto.fullName ?? null,
            phoneNumber: dto.phoneNumber ?? null,
            avatarUrl: dto.avatarUrl ?? null,
            vendorCode: dto.vendorCode ?? null,
            isActive: dto.isActive ?? 1,
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
      const user = await this.findOne(id);

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

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Xóa User thất bại: ${error.message}`,
      );
    }
  }
}
