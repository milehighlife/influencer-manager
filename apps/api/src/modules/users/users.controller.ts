import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { CurrentOrganizationId } from "../../common/decorators/current-organization-id.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UuidParamPipe } from "../../common/pipes/uuid-param.pipe";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUsersDto } from "./dto/query-users.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles("organization_admin")
  findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.usersService.findAll(organizationId, query);
  }

  @Get(":id")
  @Roles("organization_admin")
  findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.usersService.findOne(organizationId, id);
  }

  @Post()
  @Roles("organization_admin")
  create(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(organizationId, dto);
  }

  @Patch(":id")
  @Roles("organization_admin")
  update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("organization_admin")
  remove(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", UuidParamPipe) id: string,
  ) {
    return this.usersService.remove(organizationId, id);
  }
}
