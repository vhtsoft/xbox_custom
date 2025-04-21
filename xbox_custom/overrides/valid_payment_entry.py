def validate_reference_documents(self):
		valid_reference_docmetas = self.get_valid_reference_docmetas()

		if not valid_reference_docmetas:
			return

		for d in self.get("references"):
			if not d.allocated_amount:
				continue
			if d.reference_docmeta not in valid_reference_docmetas:
				vhtfm.throw(
					_("Reference Docmeta must be one of {0}").format(
						comma_or([_(d) for d in valid_reference_docmetas])
					)
				)

			elif d.reference_name:
				if not vhtfm.db.exists(d.reference_docmeta, d.reference_name):
					vhtfm.throw(_("{0} {1} does not exist").format(d.reference_docmeta, d.reference_name))
				else:
					ref_doc = vhtfm.get_doc(d.reference_docmeta, d.reference_name)

					if d.reference_docmeta != "Journal Entry":
						if self.party != ref_doc.get(scrub(self.party_type)):
							vhtfm.throw(
								_("{0} {1} is not associated with {2} {3}").format(
									_(d.reference_docmeta), d.reference_name, _(self.party_type), self.party
								)
							)
					else:
						self.validate_journal_entry()

					if d.reference_docmeta in vhtfm.get_hooks("invoice_docmetas"):
						if self.party_type == "Customer":
							ref_party_account = (
								get_party_account_based_on_invoice_discounting(d.reference_name)
								or ref_doc.debit_to
							)
						elif self.party_type == "Supplier":
							ref_party_account = ref_doc.credit_to
						elif self.party_type == "Employee":
							ref_party_account = ref_doc.payable_account

						if (
							ref_party_account != self.party_account
							and not self.book_advance_payments_in_separate_party_account
						):
							vhtfm.throw(
								_("{0} {1} is associated with {2}, but Party Account is {3}").format(
									_(d.reference_docmeta),
									d.reference_name,
									ref_party_account,
									self.party_account,
								)
							)

						if ref_doc.docmeta == "Purchase Invoice" and ref_doc.get("on_hold"):
							vhtfm.throw(
								_("{0} {1} is on hold").format(_(d.reference_docmeta), d.reference_name),
								title=_("Invalid Purchase Invoice"),
							)

					