import { Controller, Get, Patch, Delete, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto, UpdateSettingsDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    async getProfile(@CurrentUser('id') userId: string) {
        return this.usersService.getProfile(userId);
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(userId, updateProfileDto);
    }

    @Patch('password')
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(userId, changePasswordDto);
    }

    @Delete('account')
    async deleteAccount(@CurrentUser('id') userId: string) {
        return this.usersService.deleteAccount(userId);
    }

    @Get('settings')
    async getSettings(@CurrentUser('id') userId: string) {
        return this.usersService.getSettings(userId);
    }

    @Patch('settings')
    async updateSettings(
        @CurrentUser('id') userId: string,
        @Body() updateSettingsDto: UpdateSettingsDto,
    ) {
        return this.usersService.updateSettings(userId, updateSettingsDto);
    }
}
