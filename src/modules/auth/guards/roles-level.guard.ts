import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_LEVEL_KEY } from '../decorators/roles-level.decorator';

@Injectable()
export class RolesLevelGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevel = this.reflector.get<number>(
      ROLES_LEVEL_KEY,
      context.getHandler(),
    );

    if (!requiredLevel) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.maxRoleLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient permission');
    }

    return true;
  }
}