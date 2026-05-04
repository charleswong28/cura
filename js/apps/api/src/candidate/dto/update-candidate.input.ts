import { InputType, PartialType } from "@nestjs/graphql";
import { CreateCandidateInput } from "./create-candidate.input";

@InputType()
export class UpdateCandidateInput extends PartialType(CreateCandidateInput) {}
