import { FormValidator } from "#src/utils/FormValidator.js";
import { SearchClaimReferenceErrors } from "../../models/form.types.js";

export class SearchClaimValidator extends FormValidator {

    validateSearchClaimForm(reference: string | null): Partial<SearchClaimReferenceErrors> {
        if(reference === null || reference === "") {
            return {
                "claimReference": {
                    text: "Enter the claim reference number"
                }
            };
        }

        const validReferenceRegex = /^INQC-[A-Za-z0-9]{4}-[A-Za-z0-9]{3}$/;
        if(!validReferenceRegex.test(reference)) {
            return {
                "claimReference": {
                    text: "Enter a claim reference number in the correct format"
                }
            };
        }

        return {};
    }
}
