import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from "@nestjs/common";
import {
    User
} from "@prisma/client";
import * as moment from "moment";
import * as nodemailer from "nodemailer";
import {
    ConfigService
} from "src/config/config.service";

@Injectable()
export class EmailService {
    constructor(private config: ConfigService) {}
    private readonly logger = new Logger(EmailService.name);

    getTransporter() {
        if (!this.config.get("smtp.enabled"))
            throw new InternalServerErrorException("SMTP is disabled");

        return nodemailer.createTransport({
            host: this.config.get("smtp.host"),
            port: this.config.get("smtp.port"),
            secure: this.config.get("smtp.port") == 465,
            auth: {
                user: this.config.get("smtp.username"),
                pass: this.config.get("smtp.password"),
            },
            tls: {
                // Do not fail on invalid certs
                rejectUnauthorized: this.config.get("smtp.port") != 25
            }
        });
    }

    private async sendMail(email: string, subject: string, text: string) {
        await this.getTransporter()
            .sendMail({
                from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
                to: email,
                subject,
                text,
            })
            .catch((e) => {
                this.logger.error(e);
                throw new InternalServerErrorException("Failed to send email");
            });
    }

    /* Mails vom Vorstufen Account */
    async sendMailToShareRecipients(recipientEmail, shareId, creator, description, expiration) {
        if (!this.config.get("email.enableShareEmailRecipients"))
            throw new common_1.InternalServerErrorException("Email service disabled");
        const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;

        const text = this.config
            .get("email.shareRecipientsMessage")
            .replaceAll("\\n", "\n")
            .replaceAll("{creator}", creator?.username ?? "Someone")
            .replaceAll("{shareUrl}", shareUrl)
            .replaceAll("{desc}", description ?? "No description")
            .replaceAll("{expires}", moment(expiration).unix() != 0 ?
                moment(expiration).fromNow() :
                "in: never");

        await this.getTransporter()
            .sendMail({
                from: `"Vorstufe Evers" <${creator.email}>`,
                to: recipientEmail,
                bcc: creator.email,
                subject: this.config.get("email.shareRecipientsSubject"),
                text: text,
            }).catch((e) => {
                this.logger.error(e);
                throw new common_1.InternalServerErrorException("Failed to send email");
            });
    }

    /* Mails andere Accounts und Reverse Share */
    async sendMailToReverseShareCreator(recipientEmail, shareId, creator, description, expiration) {
        const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;
        await this.sendMail(recipientEmail, this.config.get("email.reverseShareSubject"), this.config
            .get("email.reverseShareMessage")
            .replaceAll("\\n", "\n")
            .replaceAll("{creator}", creator?.username ?? "Someone")
            .replaceAll("{shareUrl}", shareUrl)
            .replaceAll("{desc}", description ?? "No description")
            .replaceAll("{expires}", moment(expiration).unix() != 0 ?
                moment(expiration).fromNow() :
                "in: never"));
    }

    async sendResetPasswordEmail(recipientEmail: string, token: string) {
        const resetPasswordUrl = `${this.config.get(
      "general.appUrl",
    )}/auth/resetPassword/${token}`;

        await this.sendMail(
            recipientEmail,
            this.config.get("email.resetPasswordSubject"),
            this.config
            .get("email.resetPasswordMessage")
            .replaceAll("\\n", "\n")
            .replaceAll("{url}", resetPasswordUrl),
        );
    }

    async sendInviteEmail(recipientEmail: string, password: string) {
        const loginUrl = `${this.config.get("general.appUrl")}/auth/signIn`;

        await this.sendMail(
            recipientEmail,
            this.config.get("email.inviteSubject"),
            this.config
            .get("email.inviteMessage")
            .replaceAll("{url}", loginUrl)
            .replaceAll("{password}", password),
        );
    }

    async sendTestMail(recipientEmail: string) {
        await this.getTransporter()
            .sendMail({
                from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
                to: recipientEmail,
                subject: "Test email",
                text: "This is a test email",
            })
            .catch((e) => {
                this.logger.error(e);
                throw new InternalServerErrorException(e.message);
            });
    }
}
