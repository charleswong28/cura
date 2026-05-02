import { InputType, PartialType } from "@nestjs/graphql";
import { CreateJobInput } from "./create-job.input";

@InputType()
export class UpdateJobInput extends PartialType(CreateJobInput) {}
