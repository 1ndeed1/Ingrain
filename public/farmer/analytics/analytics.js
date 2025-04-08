const socket = io('http://localhost:3000', { 
    withCredentials: true,
    auth: { token: localStorage.getItem('token'), userId: localStorage.getItem('userId') }
});

let overviewChart, profitSalesChart, quantityChart;

document.addEventListener('DOMContentLoaded', () => {
    const role = localStorage.getItem('role');
    if (role !== 'farmer') {
        window.location.href = '/login';
        return;
    }

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '/farmer'; // Redirect back to farmer dashboard
    });

    updateCharts();
});

async function updateCharts() {
    const timePeriod = document.getElementById('timePeriod').value;
    const sortBy = document.getElementById('sortBy').value;
    const profitRange = parseInt(document.getElementById('profitRange').value);
    document.getElementById('profitRangeValue').textContent = profitRange.toLocaleString();

    try {
        const response = await fetch(`/api/farmer/analytics?period=${timePeriod}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load analytics');
        let data = await response.json();

        // Apply profit filter
        data.labels = data.labels.filter((_, i) => data.profit[i] <= profitRange);
        data.listed = data.labels.map(label => data.listed[data.labels.indexOf(label)]);
        data.sold = data.labels.map(label => data.sold[data.labels.indexOf(label)]);
        data.profit = data.labels.map(label => data.profit[data.labels.indexOf(label)]);
        data.sales = data.labels.map(label => data.sales[data.labels.indexOf(label)]);
        data.quantitySold = data.labels.map(label => data.quantitySold[data.labels.indexOf(label)]);

        // Sort data
        const sortIndex = { date: 0, productsListed: 1, productsSold: 2, profit: 3, sales: 4, quantity: 5 };
        const sortFn = (a, b) => {
            const indices = [data.labels.indexOf(a), data.labels.indexOf(b)];
            const values = [
                a, // date
                data.listed[indices[0]] - data.listed[indices[1]],
                data.sold[indices[0]] - data.sold[indices[1]],
                data.profit[indices[0]] - data.profit[indices[1]],
                data.sales[indices[0]] - data.sales[indices[1]],
                data.quantitySold[indices[0]] - data.quantitySold[indices[1]]
            ];
            return values[sortIndex[sortBy]];
        };
        data.labels.sort(sortFn);
        data.listed.sort((a, b) => sortFn(data.labels[data.listed.indexOf(a)], data.labels[data.listed.indexOf(b)]));
        data.sold.sort((a, b) => sortFn(data.labels[data.sold.indexOf(a)], data.labels[data.sold.indexOf(b)]));
        data.profit.sort((a, b) => sortFn(data.labels[data.profit.indexOf(a)], data.labels[data.profit.indexOf(b)]));
        data.sales.sort((a, b) => sortFn(data.labels[data.sales.indexOf(a)], data.labels[data.sales.indexOf(b)]));
        data.quantitySold.sort((a, b) => sortFn(data.labels[data.quantitySold.indexOf(a)], data.labels[data.quantitySold.indexOf(b)]));

        // Destroy existing charts
        if (overviewChart) overviewChart.destroy();
        if (profitSalesChart) profitSalesChart.destroy();
        if (quantityChart) quantityChart.destroy();

        // Overview Chart (Products Listed and Sold)
        const ctxOverview = document.getElementById('overviewChart').getContext('2d');
        overviewChart = new Chart(ctxOverview, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Products Listed',
                        data: data.listed,
                        backgroundColor: 'rgba(66, 133, 244, 0.2)',
                        borderColor: 'rgba(66, 133, 244, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Products Sold',
                        data: data.sold,
                        backgroundColor: 'rgba(52, 168, 83, 0.2)',
                        borderColor: 'rgba(52, 168, 83, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } },
                plugins: { legend: { position: 'top' } }
            }
        });

        // Profit & Sales Chart
        const ctxProfitSales = document.getElementById('profitSalesChart').getContext('2d');
        profitSalesChart = new Chart(ctxProfitSales, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Profit (₹)',
                        data: data.profit,
                        borderColor: 'rgba(251, 188, 5, 1)',
                        backgroundColor: 'rgba(251, 188, 5, 0.2)',
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Sales (₹)',
                        data: data.sales,
                        borderColor: 'rgba(234, 67, 53, 1)',
                        backgroundColor: 'rgba(234, 67, 53, 0.2)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Amount (₹)' } } },
                plugins: { legend: { position: 'top' } }
            }
        });

        // Quantity Chart
        const ctxQuantity = document.getElementById('quantityChart').getContext('2d');
        quantityChart = new Chart(ctxQuantity, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Quantity Sold (kg)',
                        data: data.quantitySold,
                        borderColor: 'rgba(109, 76, 65, 1)',
                        backgroundColor: 'rgba(109, 76, 65, 0.2)',
                        fill: true,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, title: { display: true, text: 'Quantity (kg)' } } },
                plugins: { legend: { position: 'top' } }
            }
        });

        // Update insights
        document.getElementById('totalListed').textContent = data.listed.reduce((a, b) => a + b, 0);
        document.getElementById('totalSold').textContent = data.sold.reduce((a, b) => a + b, 0);
        document.getElementById('totalProfit').textContent = data.profit.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('totalSales').textContent = data.sales.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('totalQuantity').textContent = data.quantitySold.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('avgTimeToSell').textContent = data.avgTimeToSellOverall.toFixed(1);
        document.getElementById('mostProfitable').textContent = data.mostProfitableDay;
        document.getElementById('peakListing').textContent = data.peakListingDay;
    } catch (err) {
        document.querySelector('.charts').innerHTML = `<p class="error">${err.message} <button onclick="updateCharts()">Retry</button></p>`;
    }
}