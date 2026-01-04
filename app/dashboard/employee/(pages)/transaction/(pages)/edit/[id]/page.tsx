import React from "react";
import { redirect } from "next/navigation";

const EditTransactionPage = async ({ params }: { params: { id: string } }) => {
  // Transaction editing is not supported yet - redirect to transaction list
  redirect("/dashboard/employee/transaction");
};

export default EditTransactionPage;