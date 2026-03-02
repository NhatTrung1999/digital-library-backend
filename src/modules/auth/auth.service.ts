import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject('LYG_DL') private readonly db: Sequelize,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: any) {
    const existed = await this.usersService.checkExist(
      dto.username,
      dto.email,
    );
    if (existed) {
      throw new BadRequestException('User already exists');
    }

    const transaction = await this.db.transaction();

    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);

      const userId = await this.usersService.createUser(
        {
          username: dto.username,
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          vendorCode: dto.vendorCode,
        },
        transaction,
      );

      // role mặc định
      await this.usersService.assignRole(userId, 'USER', transaction);

      await transaction.commit();
      return { userId };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    const match = await bcrypt.compare(password, user.Password);
    if (!match) return null;

    delete user.Password;
    return user;
  }

  async login(user: any) {
  const roles = await this.usersService.getUserRoles(user.UserID);

  const maxRoleLevel = Math.max(...roles.map(r => r.RoleLevel));

  const payload = {
    userId: user.UserID,
    username: user.Username,
    roles: roles.map(r => r.RoleCode),
    maxRoleLevel,
  };

  return {
    accessToken: this.jwtService.sign(payload),
  };
}
}
