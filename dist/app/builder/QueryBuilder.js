"use strict";
// Query Builder in Prisma
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class QueryBuilder {
    constructor(model, query) {
        this.prismaQuery = {};
        this.primaryKeyField = 'id'; // Default primary key field
        this.model = model;
        this.query = query;
    }
    // Search
    search(searchableFields) {
        const searchTerm = this.query.searchTerm;
        if (searchTerm) {
            this.prismaQuery.where = Object.assign(Object.assign({}, this.prismaQuery.where), { OR: searchableFields.map(field => {
                    if (field.includes('.')) {
                        const [parentField, childField] = field.split('.');
                        return {
                            [parentField]: {
                                [childField]: { contains: searchTerm, mode: 'insensitive' },
                            },
                        };
                    }
                    return { [field]: { contains: searchTerm, mode: 'insensitive' } };
                }) });
        }
        return this;
    }
    // Filter
    filter() {
        const queryObj = Object.assign({}, this.query);
        const excludeFields = [
            'searchTerm',
            'sort',
            'limit',
            'page',
            'fields',
            'exclude',
        ];
        excludeFields.forEach(field => delete queryObj[field]);
        const formattedFilters = {};
        const setNestedObject = (obj, path, value) => {
            const keys = path.split('.');
            let current = obj;
            keys.forEach((key, index) => {
                if (index === keys.length - 1) {
                    current[key] = value;
                }
                else {
                    if (!current[key] || typeof current[key] !== 'object') {
                        current[key] = {};
                    }
                    current = current[key];
                }
            });
        };
        for (const [key, value] of Object.entries(queryObj)) {
            setNestedObject(formattedFilters, key, value);
        }
        this.prismaQuery.where = Object.assign(Object.assign({}, this.prismaQuery.where), formattedFilters);
        return this;
    }
    //optional include
    include(data) {
        if (data) {
            this.prismaQuery.include = Object.assign(Object.assign({}, this.prismaQuery.include), data);
        }
        return this;
    }
    //optional select
    select(data) {
        if (data) {
            this.prismaQuery.select = Object.assign(Object.assign({}, this.prismaQuery.select), data);
        }
        return this;
    }
    where(conditions) {
        this.prismaQuery.where = Object.assign(Object.assign({}, this.prismaQuery.where), conditions);
        return this;
    }
    // Sorting
    sort() {
        var _a;
        const sort = ((_a = this.query.sort) === null || _a === void 0 ? void 0 : _a.split(',')) || ['-createdAt'];
        this.prismaQuery.orderBy = sort.map(field => field.startsWith('-') ? { [field.slice(1)]: 'desc' } : { [field]: 'asc' });
        return this;
    }
    // Pagination
    paginate() {
        const page = Number(this.query.page) || 1;
        const limit = Number(this.query.limit) || 10;
        const skip = (page - 1) * limit;
        this.prismaQuery.skip = skip;
        this.prismaQuery.take = limit;
        return this;
    }
    // Fields Selection
    fields() {
        const fieldsParam = this.query.fields;
        if (fieldsParam) {
            const fields = fieldsParam
                .split(',')
                .filter(field => field.trim() !== '');
            if (fields.length > 0) {
                this.prismaQuery.select = {};
                fields.forEach(field => {
                    const trimmedField = field.trim();
                    if (trimmedField.startsWith('-')) {
                        this.prismaQuery.select[trimmedField.slice(1)] = false;
                    }
                    else {
                        this.prismaQuery.select[trimmedField] = true;
                    }
                });
                const hasAtLeastOneTrueField = Object.values(this.prismaQuery.select).some(value => value === true);
                if (!hasAtLeastOneTrueField) {
                    this.prismaQuery.select[this.primaryKeyField] = true;
                }
            }
        }
        return this;
    }
    customFields(data) {
        if (data) {
            this.prismaQuery.select = data;
        }
        return this;
    }
    // Exclude Fields
    exclude() {
        const excludeParam = this.query.exclude;
        if (excludeParam) {
            const excludeFields = excludeParam
                .split(',')
                .filter(field => field.trim() !== '');
            if (!this.prismaQuery.select) {
                this.prismaQuery.select = {};
            }
            excludeFields.forEach(field => {
                this.prismaQuery.select[field.trim()] = false;
            });
            const hasAtLeastOneTrueField = Object.values(this.prismaQuery.select).some(value => value === true);
            if (!hasAtLeastOneTrueField) {
                this.prismaQuery.select[this.primaryKeyField] = true;
            }
        }
        return this;
    }
    // Execute Query
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.prismaQuery.select) {
                if (Object.keys(this.prismaQuery.select).length === 0) {
                    delete this.prismaQuery.select;
                }
                if (this.query.fields) {
                    const hasAtLeastOneTrueField = Object.values(this.prismaQuery.select).some(value => value === true);
                    if (!hasAtLeastOneTrueField) {
                        this.prismaQuery.select[this.primaryKeyField] = true;
                    }
                }
            }
            // Run findMany and count in parallel
            const [results, total] = yield Promise.all([
                this.model.findMany(this.prismaQuery),
                this.model.count({ where: this.prismaQuery.where }),
            ]);
            // Handle removing primary key from results if requested
            let processedResults = results;
            if (this.query.fields && results.length > 0) {
                const fieldsRequested = this.query.fields
                    .split(',')
                    .map(f => f.trim());
                if (!fieldsRequested.includes(this.primaryKeyField)) {
                    processedResults = results.map((item) => {
                        const newItem = Object.assign({}, item);
                        delete newItem[this.primaryKeyField];
                        return newItem;
                    });
                }
            }
            const page = Number(this.query.page) || 1;
            const limit = Number(this.query.limit) || 10;
            return {
                data: processedResults,
                meta: {
                    page,
                    limit,
                    total,
                    totalPage: Math.ceil(total / limit),
                },
            };
        });
    }
}
exports.default = QueryBuilder;
