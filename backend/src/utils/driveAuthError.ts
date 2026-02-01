export class DriveAuthError extends Error {
  public readonly accountId: string;
  public readonly accountEmail: string;
  public readonly isAuthError: boolean = true;
  public readonly statusCode: number = 401;

  constructor(message: string, accountId: string, accountEmail: string) {
    super(message);
    this.name = 'DriveAuthError';
    this.accountId = accountId;
    this.accountEmail = accountEmail;
  }

  toJSON() {
    return {
      error: this.message,
      needsReconnect: true,
      accountId: this.accountId,
      accountEmail: this.accountEmail
    };
  }
}

export class DriveAccountRevokedError extends DriveAuthError {
  constructor(accountId: string, accountEmail: string) {
    super('Drive account is disconnected. Please reconnect your Google Drive account.', accountId, accountEmail);
    this.name = 'DriveAccountRevokedError';
  }
}

export class DriveTokenExpiredError extends DriveAuthError {
  constructor(accountId: string, accountEmail: string) {
    super('Drive account authentication expired. Please reconnect your Google Drive account.', accountId, accountEmail);
    this.name = 'DriveTokenExpiredError';
  }
}
