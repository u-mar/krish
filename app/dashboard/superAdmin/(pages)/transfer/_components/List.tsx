"use client";
import { DataTable } from "@/components/ui/dataTable";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { API } from "@/lib/config";
import Loading from "@/app/loading";

export default function List() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => axios.get(`${API}/superAdmin/transfer`).then((res) => res.data),
    staleTime: 60 * 1000,
    retry: 3,
  });

  if (isLoading) {
    return <Loading />;
  }

  if (isError || !data) {
    return <div>Error loading transfers.</div>;
  }

  return (
    <div className="my-4 space-y-4 sm:p-6 lg:p-2">
      <div className="flex justify-between">
        <h1 className="font-bold text-2xl">Product Transfers</h1>
        <Link href={"/dashboard/superAdmin/transfer/add"}>
          <Button variant={"default"}>New Transfer</Button>
        </Link>
      </div>
      <DataTable columns={columns} data={data} type={"transfer"} search={"notes"} />
    </div>
  );
}
