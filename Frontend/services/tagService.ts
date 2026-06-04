import api from "./api";
import type {
  Tag,
  CreateTagPayload,
  UpdateTagPayload,
  PagedResult,
  TagQuery,
  ImportResult,
} from "../types";

export const tagService = {
  getAll: async (query?: TagQuery): Promise<PagedResult<Tag>> => {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    const { data } = await api.get<PagedResult<Tag>>(`/tags?${params}`);
    return data;
  },

  getById: async (id: string): Promise<Tag> => {
    const { data } = await api.get<Tag>(`/tags/${id}`);
    return data;
  },

  create: async (payload: CreateTagPayload): Promise<Tag> => {
    const { data } = await api.post<Tag>("/tags", payload);
    return data;
  },

  update: async (id: string, payload: UpdateTagPayload): Promise<Tag> => {
    const { data } = await api.put<Tag>(`/tags/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },

  importXml: async (xmlContent: string): Promise<ImportResult> => {
    const { data } = await api.post<ImportResult>("/tags/import", xmlContent, {
      headers: { "Content-Type": "application/xml" },
    });
    return data;
  },

  importJson: async (jsonContent: string): Promise<ImportResult> => {
    const { data } = await api.post<ImportResult>("/tags/import", jsonContent, {
      headers: { "Content-Type": "application/json" },
    });
    return data;
  },
};
