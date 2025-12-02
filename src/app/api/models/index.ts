import Document from "./document.model";
import Recipient from "./recipient.model";
import User from "./user.model";
import DocumentData from "./documentData.model";
import DocumentMeta from "./documentMeta.model";
import Team from "./team.model";
import Folder from "./folder.model";
import DocumentAuditLog from "./documentAuditLog.model";
import TeamEmail from "./teamEmail.model";
import TeamGroup from "./teamGroup.model";
import Organisation from "./organisation.model";
import ApiKey from "./apiKey.model";

// Set up associations
const models = {
  User,
  Document,
  Recipient,
  DocumentData,
  DocumentMeta,
  Team,
  Folder,
  DocumentAuditLog,
  TeamEmail,
  TeamGroup,
  Organisation,
  ApiKey,
};

// Run associations
Object.values(models).forEach((model) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (model.associate) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    model.associate(models);
  }
});

export {
  User,
  Document,
  Recipient,
  DocumentData,
  DocumentMeta,
  Team,
  Folder,
  DocumentAuditLog,
  TeamEmail,
  TeamGroup,
  Organisation,
  ApiKey,
  
};
